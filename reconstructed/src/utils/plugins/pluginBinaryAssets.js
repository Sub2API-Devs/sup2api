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
} from "path";
import {
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
  realpath,
  realpath as realpath_2,
  realpath as realpath_3,
  realpath as realpath_4,
  realpath as realpath_5,
  realpath as realpath_6,
  realpath as realpath_7,
  realpath as realpath_8,
  realpath as realpath_9,
  realpath as realpath_10,
  realpath as realpath_11,
  realpath as realpath_12,
  realpath as realpath_13,
  realpath as realpath_14,
  realpath as realpath_15,
  realpath as realpath_16,
  realpath as realpath_17,
  realpath as realpath_18,
  realpath as realpath_19,
  realpath as realpath_20,
  realpath as realpath_21,
  realpath as realpath_22,
  realpath as realpath_23,
  realpath as realpath_24,
  realpath as realpath_25,
  realpath as realpath_26,
  realpath as realpath_27,
  realpath as realpath_28,
  realpath as realpath_29,
  realpath as realpath_30,
  realpath as realpath_31,
  realpath as realpath_32,
  realpath as realpath_33,
  realpath as realpath_34,
  realpath as realpath_35,
  realpath as realpath_36,
  realpath as realpath_37,
  realpath as realpath_38,
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
  utimes,
  utimes as utimes_2,
  utimes as utimes_3,
  copyFile,
  copyFile as copyFile_2,
  copyFile as copyFile_3,
  copyFile as copyFile_4,
  copyFile as copyFile_5,
  link,
  link as link_2,
  link as link_3,
  rename,
  rename as rename_2,
  rename as rename_3,
  rename as rename_4,
  rename as rename_5,
  rename as rename_6,
  rename as rename_7,
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
} from "fs/promises";
import {
  createHash,
  createHash as createHash_2,
  createHash as createHash_3,
  createHash as createHash_4,
  createHash as createHash_5,
  createHash as createHash_6,
  createHash as createHash_7,
  createHash as createHash_8,
  createHash as createHash_9,
  createHash as createHash_10,
  createHash as createHash_11,
  createHash as createHash_12,
  createHash as createHash_13,
  createHash as createHash_14,
  createHash as createHash_15,
  createHash as createHash_16,
  createHash as createHash_17,
  createHash as createHash_18,
  createHash as createHash_19,
  createHash as createHash_20,
  createHash as createHash_21,
  createHash as createHash_22,
  createHash as createHash_23,
  createHash as createHash_24,
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
import { q5r, binaryBaseNameForTarget, $c } from "../platformTargets.js";
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
import { hm } from "../pathPrefix.js";
import { c5t } from "./pluginDirectories.js";
import { hasLinkedAncestorBelow } from "./pluginCacheMaterialize.js";
import { STORAGE_SPACES, JOi } from "../storage/storageSpaces.js";
import { getPlatform } from "../platform.js";
import { x7s } from "../../services/memorySync/syncFiles.js";
import { sleep } from "../sleep.js";
import { apiClient } from "../../services/routines/routinesApi.js";
import { OAUTH_BETA_HEADER } from "../../constants/oauth.js";
import { LINKMISDIRECTED, LINKUNVERIFIED } from "../fsSafety/hardenedRead.js";
import { AI } from "./safeCopy.js";
import { getClaudeConfigDir } from "../envUtils.js";

//@ chunk-e6aww6q8.js:4369039-4369171 placement
var ASSET_LOG_PREFIX = "[pluginBinaryAssets]",
  ASSET_CACHE = "asset-cache",
  ASSET_FETCH_TIMEOUT_MS = 120000,
  ASSET_TOTAL_BUDGET_MS = 300000,
  ASSET_STALL_TIMEOUT_MS = 30000,
  MAX_ASSET_BYTES = q5r,
  ASSET_RETRY_DELAYS_MS = [1000, 2000],
  ASSET_CACHE_TTL_MS = 2592000000,
  TEMP_FILE_TTL_MS = 86400000;
//@ chunk-e6aww6q8.js:4369171-4369295 placement
class PluginAssetFetchError extends Error {
  code;
  status;
  constructor(e, n, r) {
    super(e);
    ((this.name = "PluginAssetFetchError"), (this.code = n), (this.status = r));
  }
}
//@ chunk-e6aww6q8.js:4369295-4369393 placement
function i_s() {
  return (
    env.CLAUDE_CODE_PLUGIN_BINARY_ASSETS ||
    getFeatureValue_CACHED_MAY_BE_STALE("tengu_plugin_binary_assets", !1) === !0
  );
}
//@ chunk-e6aww6q8.js:4369393-4369572 placement
async function provisionBinaryAssets(e, n, r) {
  let s = r?.assetCacheDir ?? join_120(projectPluginsDir(), ASSET_CACHE),
    h = r?.storageV5,
    y = isStorageV5Enabled() && h !== void 0 ? ngi(s) : null;
  try {
    await provisionPluginBinaryAssets(e, n, s, y, r);
  } finally {
    await sweepStaleTempFiles(s, h, y).catch(() => {
      return;
    });
  }
}
//@ chunk-e6aww6q8.js:4369572-4369651 placement
function Xct(e) {
  return (
    PluginIdSchema().safeParse(e).success &&
    isOfficialMarketplaceName_3(parsePluginIdentifier(e).marketplace) &&
    i_s()
  );
}
/**
 * 为插件准备二进制资源：下载、校验并放到插件目录的 bin 下。
 */
//@ chunk-e6aww6q8.js:4369651-4373603 placement
async function provisionPluginBinaryAssets(e, n, r, s, h) {
  if (!Xct(n)) return;
  let startTime = performance.now(),
    S = 0,
    w = 0,
    L = 0,
    G = 0,
    q = 0,
    Z = 0,
    Se = 0,
    ke,
    we,
    Ee,
    Ae = !1;
  function Ie(Me, We) {
    ((Ee ??=
      Me instanceof PluginAssetFetchError
        ? Me.code
        : (sanitizeErrnoForTelemetry(Me) ?? sanitizeErrorName_2(Me) ?? "unknown")),
      logForDebugging(`${ASSET_LOG_PREFIX} ${n}: ${We}: ${Me instanceof Error ? Me.message : String(Me)}`, {
        level: "warn",
      }));
  }
  try {
    let Me = h?.storageV5,
      We = isStorageV5Enabled() && Me !== void 0 ? await m_s(e) : null,
      ze = s !== null ? We : null;
    if (!(await isDirectoryPresent(e, Me, We))) {
      (logFeatureBad("plugin_binary_assets", "plugin_root_not_dir", { expected_count: 0 }),
        logForDebugging(
          `${ASSET_LOG_PREFIX} ${n}: plugin root is not a real directory; refusing to provision binaries`,
          { level: "warn" },
        ));
      return;
    }
    let lt = await getPluginVersionFromManifest(e, Me, We);
    if (!lt) return;
    Ae = !0;
    let entries = Object.entries(lt);
    S = entries.length;
    let nt = join_120(e, "bin"),
      pt = await ensureBinDir(nt, Me, We);
    if (pt !== "ok") {
      Ee = pt;
      return;
    }
    if (!(await resolveContainedBinDir(nt, e, Me, We))) {
      Ee = "bin_outside_plugin";
      return;
    }
    let Et = [],
      yt = [],
      gt = [];
    for (let [Yt, qt] of entries) {
      if (performance.now() - startTime > ASSET_TOTAL_BUDGET_MS) {
        Ee ??= "pass_deadline_exceeded";
        break;
      }
      try {
        let Zt = await resolveContainedBinDir(nt, e, Me, We);
        if (!Zt) {
          Ee ??= "bin_dir_race";
          continue;
        }
        let rn = join_120(Zt, Yt),
          pn = We === null ? void 0 : Z6(We, Yt);
        switch (await verifyPlacedAsset(rn, qt.sha256, { ensureMode: 493, guestWritable: !0 }, Me, pn)) {
          case "match":
            (L++, gt.push([Yt, qt]));
            continue;
          case "absent":
            Et.push([Yt, qt]);
            continue;
          case "mismatch":
          case "not_regular": {
            we ??= "asset_present_digest_mismatch";
            let hn = await resolveContainedBinDir(nt, e, Me, We);
            if (!hn) {
              Ee ??= "bin_dir_race";
              continue;
            }
            try {
              await removeBinEntry(hn, Yt, Me, We);
            } catch (error) {
              (logForDebugging(
                `${ASSET_LOG_PREFIX} ${n}: failed to remove mismatched bin/${Yt}: ${error instanceof Error ? error.message : String(error)}`,
                { level: "warn" },
              ),
                yt.push([Yt, qt]));
              continue;
            }
            (Z++,
              logForDebugging(
                `${ASSET_LOG_PREFIX} ${n}: removed bin/${Yt} \u2014 it is not the artifact pinned by the manifest`,
                { level: "warn" },
              ),
              yt.push([Yt, qt]));
            continue;
          }
          case "unreadable":
            ((Ee ??= "asset_unverifiable"), Et.push([Yt, qt]));
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
          { level: "warn" },
        );
      if (sliced.length > 0)
        try {
          await b_s(r, Me, s);
        } catch (error) {
          (Ie(error, "failed to create the asset cache dir"), (sliced = []));
        }
      for (let [qt, Zt] of sliced) {
        if (performance.now() - startTime > ASSET_TOTAL_BUDGET_MS) {
          Ee ??= "pass_deadline_exceeded";
          break;
        }
        try {
          let { cachePath: cachePath, cacheHit: cacheHit } = await fetchAssetToCache(
            Zt.sha256,
            r,
            Me,
            s,
            h?.retryDelaysMs ?? ASSET_RETRY_DELAYS_MS,
            startTime + ASSET_TOTAL_BUDGET_MS,
            h?.downloadTimeoutMs ?? ASSET_FETCH_TIMEOUT_MS,
            h?.credentials,
          );
          if (cacheHit) G++;
          else q++;
          let no = await resolveContainedBinDir(nt, e, Me, We);
          if (!no) {
            Ee ??= "bin_dir_race";
            continue;
          }
          (await placePluginBinaryAsset(cachePath, r, no, qt, Zt.sha256, Me, ze), w++, gt.push([qt, Zt]));
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
    if (It !== void 0) {
      let Yt = new Map();
      for (let [Zt] of entries) {
        let rn = binaryBaseNameForTarget(Zt, It);
        if (rn !== void 0) Yt.set(rn, (Yt.get(rn) ?? 0) + 1);
      }
      let startTime = performance.now();
      for (let [Zt, rn] of gt) {
        if (performance.now() - startTime > ASSET_STALL_TIMEOUT_MS) {
          Ee ??= "pass_deadline_exceeded";
          break;
        }
        let pn = binaryBaseNameForTarget(Zt, It);
        if (pn === void 0 || Object.hasOwn(lt, pn)) continue;
        if ((Yt.get(pn) ?? 0) > 1) {
          (logForDebugging(
            `${ASSET_LOG_PREFIX} ${n}: multiple declared entries derive bin/${pn}; refusing to pick one`,
            { level: "warn" },
          ),
            (we ??= "asset_bare_name_collision"));
          continue;
        }
        try {
          let no = await resolveContainedBinDir(nt, e, Me, We);
          if (!no) {
            Ee ??= "bin_dir_race";
            continue;
          }
          let hn = await linkAssetIntoBin(no, Zt, pn, rn.sha256, Me, We);
          if (hn === "placed") {
            Se++;
            continue;
          }
          if (hn === "exists") continue;
          if (hn === "failed_created") {
            let ho = await resolveContainedBinDir(nt, e, Me, We);
            if (ho)
              await removeBinEntry(ho, pn, Me, We).catch(() => {
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
          expected_count: S,
          placed_count: w,
          already_present_count: L,
          cache_hit_count: G,
          download_count: q,
          mismatch_removed_count: Z,
          bare_placed_count: Se,
          duration_ms: Math.round(performance.now() - startTime),
        },
        We = we ?? Ee;
      if (We !== void 0)
        if (w + L > 0) logFeatureSad("plugin_binary_assets", We, Me);
        else logFeatureBad("plugin_binary_assets", We, Me);
      else if (ke !== void 0) logFeatureSad("plugin_binary_assets", ke, Me);
      else logFeatureOk("plugin_binary_assets", Me);
    }
  }
}
/**
 * 确保插件 bin 目录存在且是目录（ok/bin_not_dir/bin_uninspectable/bin_dir_race）。
 */
//@ chunk-e6aww6q8.js:4374535-4374872 placement
async function ensureBinDir(e, n, r) {
  if (isStorageV5Enabled() && n !== void 0 && r !== null) return ensureBinDirViaStorage(n, r);
  let s;
  try {
    s = await lstat_37(e);
  } catch (error) {
    if (!isENOENT(error)) return "bin_uninspectable";
    s = null;
  }
  if (s && !s.isDirectory()) return "bin_not_dir";
  if (!s)
    try {
      await f_s(e);
    } catch (error) {
      if (getErrnoCode(error) !== "EEXIST") return "bin_uninspectable";
    }
  return (await lstat_37(e).catch(() => null))?.isDirectory() ? "ok" : "bin_dir_race";
}
/**
 * v5 存储下确保 bin 作用域存在。
 */
//@ chunk-e6aww6q8.js:4374872-4375279 placement
async function ensureBinDirViaStorage(e, n) {
  let r = Azn(n),
    scopeKind = await e.scopeKind(r);
  if (!scopeKind.ok) return "bin_uninspectable";
  if (scopeKind.value.kind === "link" || scopeKind.value.kind === "other") return "bin_not_dir";
  if (scopeKind.value.kind === "absent") {
    let ensureScope = await e.ensureScope(r, { parent: "mustExist" });
    if (!ensureScope.ok) {
      let y = storageErrorCode(ensureScope.error);
      if (y !== "EEXIST" && y !== "ENOTDIR" && y !== "ELOOP" && y !== "UnexpectedAbsent")
        return "bin_uninspectable";
    }
  }
  return (await rDe(e, r)) ? "ok" : "bin_dir_race";
}
//@ chunk-e6aww6q8.js:4375279-4375320 placement
function f_s(e) {
  return mkdir_23(e, { mode: 493 });
}
//@ chunk-e6aww6q8.js:4375320-4375601 placement
async function resolveContainedBinDir(e, n, r, s) {
  if (isStorageV5Enabled() && r !== void 0 && s !== null)
    return (await rDe(r, s)) && (await rDe(r, Azn(s))) && (await isBinInsideVersion(e, n, r, s)) ? e : null;
  if (!(await lstat_37(n).catch(() => null))?.isDirectory()) return null;
  if (!(await lstat_37(e).catch(() => null))?.isDirectory()) return null;
  return (await isBinInsideVersion(e, n, r, s)) ? e : null;
}
//@ chunk-e6aww6q8.js:4375601-4375763 placement
async function isBinInsideVersion(e, n, r, s) {
  if (isStorageV5Enabled() && r !== void 0 && s !== null) return !0;
  try {
    let [h, y] = await Promise.all([realpath_36(n), realpath_36(e)]);
    if (!hm(h, y, !1)) return !1;
  } catch {
    return !1;
  }
  return !0;
}
//@ chunk-e6aww6q8.js:4375763-4375890 placement
async function isDirectoryPresent(e, n, r) {
  if (isStorageV5Enabled() && n !== void 0 && r !== null) return rDe(n, r);
  return (await lstat_37(e).catch(() => null))?.isDirectory() === !0;
}
//@ chunk-e6aww6q8.js:4375890-4375981 placement
async function rDe(e, n) {
  let scopeKind = await e.scopeKind(n);
  return scopeKind.ok && scopeKind.value.kind === "directory";
}
//@ chunk-e6aww6q8.js:4375981-4376074 placement
async function m_s(e) {
  let n = projectPluginCacheDir(),
    r = c5t(e, n);
  if (r === null || (await hasLinkedAncestorBelow(e, n))) return null;
  return r;
}
//@ chunk-e6aww6q8.js:4376074-4376119 placement
function Azn(e) {
  return { ...e, relPath: ["bin"] };
}
//@ chunk-e6aww6q8.js:4376119-4376202 placement
function Z6(e, n) {
  return STORAGE_SPACES.pluginCache(e.marketplace, e.plugin, e.version, ["bin", n]);
}
//@ chunk-e6aww6q8.js:4376202-4376479 placement
async function removeBinEntry(e, n, r, s) {
  if (isStorageV5Enabled() && r !== void 0 && s !== null) {
    let h = await r.delete(Z6(s, n));
    if (h.ok) return;
    if (storageErrorCode(h.error) !== "EISDIR") throw storageRemovalError(h.error);
    let deleteScope = await r.deleteScope({ ...s, relPath: ["bin", n] });
    if (!deleteScope.ok) throw storageRemovalError(deleteScope.error);
    return;
  }
  await rm_25(join_120(e, n), { recursive: !0, force: !0 });
}
//@ chunk-e6aww6q8.js:4376479-4376663 placement
function storageRemovalError(e) {
  let n = storageErrorCode(e);
  return Object.assign(
    new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `removal through the storage interface failed: ${formatStorageError(e)}`,
      "removal through the storage interface failed",
    ),
    n !== void 0 ? { code: n } : {},
  );
}
//@ chunk-e6aww6q8.js:4376663-4377497 placement
async function verifyPlacedAsset(e, n, r, s, h) {
  if (r?.guestWritable && getPlatform() === "windows") return "unverifiable_windows";
  if (isStorageV5Enabled() && s !== void 0 && h !== void 0) return verifyAssetDigest(s, h, n, r?.ensureMode);
  let y;
  try {
    y = await lstat_37(e);
  } catch (error) {
    return isENOENT(error) ? "absent" : "unreadable";
  }
  if (!y.isFile()) return "not_regular";
  let S;
  try {
    S = await open_23(e, $c());
    let stats = await S.stat();
    if (!stats.isFile()) return "not_regular";
    if (stats.size > MAX_ASSET_BYTES) return "mismatch";
    let L = createHash_22("sha256");
    for await (let G of S.createReadStream({ autoClose: !1 })) L.update(G);
    if (L.digest("hex") !== n) return "mismatch";
    if (r?.ensureMode !== void 0 && getPlatform() !== "windows" && (stats.mode & 511) !== r.ensureMode)
      await S.chmod(r.ensureMode).catch(() => {
        return;
      });
    return "match";
  } catch (error) {
    let L = getErrnoCode(error);
    if (L === "ELOOP") return "not_regular";
    if (L === "EACCES" || L === "EPERM") return (y.mode & 292) === 0 ? "mismatch" : "unreadable";
    return "unreadable";
  } finally {
    await S?.close().catch(() => {
      return;
    });
  }
}
/**
 * 经存储校验资源 sha256：match/mismatch/absent/not_regular/unreadable。
 */
//@ chunk-e6aww6q8.js:4377497-4378170 placement
async function verifyAssetDigest(e, n, r, s) {
  let digest = await e.digest(n, { algorithm: "sha256", maxBytes: MAX_ASSET_BYTES });
  if (digest.ok) {
    if (digest.value.digest !== r) return "mismatch";
    let { mode: mode, object: object } = digest.value;
    if (s !== void 0 && mode !== void 0 && mode !== s && object !== void 0)
      await e.setMode(n, s, { ifObject: object }).catch(() => {
        return;
      });
    return "match";
  }
  if (digest.error.code === "NotFound") return "absent";
  let y = storageErrorCode(digest.error);
  if (y === TOOLARGE) return "mismatch";
  if (y === "ELOOP" || y === "ENXIO") return "not_regular";
  let statMeta = await e.statMeta(n);
  if (!statMeta.ok) {
    if (statMeta.error.code === "NotFound") return "absent";
    let L = storageErrorCode(statMeta.error);
    return L === "ELOOP" || L === "ENXIO" ? "not_regular" : "unreadable";
  }
  let mode = statMeta.value.mode;
  return (y === "EACCES" || y === "EPERM") && mode !== void 0 && (mode & 292) === 0
    ? "mismatch"
    : "unreadable";
}
/**
 * 资源缓存中已有且摘要匹配时刷新时间并返回命中；否则清掉非文件的占位，按重试策略下载到 .partial 临时文件后改名到缓存。
 */
//@ chunk-e6aww6q8.js:4378170-4378673 placement
async function fetchAssetToCache(e, n, r, s, h, y, S, w) {
  let L = join_120(n, e);
  if (isStorageV5Enabled() && r !== void 0 && s !== null) return writePluginAsset(e, L, r, h, y, S, w);
  if ((await verifyPlacedAsset(L, e)) === "match") {
    let date = new Date();
    return (
      await utimes_3(L, date, date).catch(() => {
        return;
      }),
      { cachePath: L, cacheHit: !0 }
    );
  }
  let G = await lstat_37(L).catch(() => null);
  if (G && !G.isFile()) await rm_25(L, { recursive: !0, force: !0 });
  return retryTransientAssetFetch(h, y, async () => {
    let q = join_120(n, `.partial-${e}-${makePidRandomId()}`);
    try {
      return (
        await downloadAssetToFile(e, q, S, w),
        await renameReplacing(q, L),
        { cachePath: L, cacheHit: !1 }
      );
    } catch (error) {
      throw (
        await rm_25(q, { force: !0 }).catch(() => {
          return;
        }),
        error
      );
    }
  });
}
//@ chunk-e6aww6q8.js:4378673-4379523 placement
async function writePluginAsset(e, n, r, s, h, y, S) {
  let pluginAssetCache = STORAGE_SPACES.pluginAssetCache(e),
    L = await Kct(r, pluginAssetCache);
  if (L.ok && L.value.digest === e) return (await r.touch(pluginAssetCache), { cachePath: n, cacheHit: !0 });
  return (
    await dropMismatchedCacheEntry(r, pluginAssetCache, e, n, L),
    retryTransientAssetFetch(s, h, async () => {
      let G = createAssetStream(e, y, S),
        writeFromStream = await r.writeFromStream(pluginAssetCache, G.chunks, {
          maxBytes: MAX_ASSET_BYTES,
          precondition: { type: "ifAbsent" },
          mode: 384,
          flush: !0,
          acquireTimeoutMs: Math.min(y, x7s),
        });
      if (writeFromStream.ok) return { cachePath: n, cacheHit: !1 };
      let failure = G.failure();
      if (failure !== void 0) throw failure;
      if (writeFromStream.error.code === "Failed" && writeFromStream.error.telemetryCode === SOURCETOOLARGE)
        throw new PluginAssetFetchError("asset exceeds size cap", "asset_too_large");
      if (writeFromStream.error.code === "AlreadyExists") {
        let Se = await Kct(r, pluginAssetCache);
        if (Se.ok && Se.value.digest === e)
          return (await r.touch(pluginAssetCache), { cachePath: n, cacheHit: !G.started() });
      }
      if (writeFromStream.error.code === "Unavailable" || writeFromStream.error.code === "Failed")
        throw new PluginAssetFetchError(
          `asset cache store failed (${formatStorageError(writeFromStream.error)})`,
          "asset_transient",
        );
      throw assetCacheStorageError(writeFromStream.error);
    })
  );
}
//@ chunk-e6aww6q8.js:4379523-4379594 placement
function Kct(e, n) {
  return e.digest(n, { algorithm: "sha256", maxBytes: MAX_ASSET_BYTES });
}
/**
 * 存储中摘要不符的缓存项按版本条件删除。
 */
//@ chunk-e6aww6q8.js:4379594-4380019 placement
async function dropMismatchedCacheEntry(e, n, r, s, h) {
  if (h.ok) {
    let stats = await e.stat(n);
    if (!stats.ok) return;
    let w = await Kct(e, n);
    if (w.ok && w.value.digest !== r)
      await e.delete(n, { precondition: { type: "ifMatch", version: stats.value.version } });
    return;
  }
  if (h.error.code === "NotFound") return;
  let y = storageErrorCode(h.error);
  if (y === "EISDIR" || y === "ENXIO") {
    let S = await lstat_37(s).catch(() => null);
    if (S && !S.isFile() && !S.isSymbolicLink()) await rm_25(s, { recursive: !0, force: !0 });
    return;
  }
  await e.delete(n);
}
//@ chunk-e6aww6q8.js:4380019-4380240 placement
function assetCacheStorageError(e) {
  logForDebugging(`${ASSET_LOG_PREFIX} asset cache storage call failed: ${formatStorageError(e)}`, {
    level: "warn",
  });
  let n = storageErrorCode(e);
  return Object.assign(Error("asset cache storage call failed"), {
    name: "PluginAssetCacheStorageError",
    ...(n !== void 0 && { code: n }),
  });
}
//@ chunk-e6aww6q8.js:4380240-4380532 placement
async function retryTransientAssetFetch(e, n, r) {
  let s = 0;
  for (;;)
    try {
      return await r();
    } catch (error) {
      let y = error instanceof PluginAssetFetchError && error.code === "asset_transient",
        S = e[s] ?? 0;
      if (!y || s >= e.length || performance.now() + S >= n) throw error;
      (s++,
        logForDebugging(
          `${ASSET_LOG_PREFIX} transient failure fetching asset (attempt ${s}); retrying in ${S}ms`,
          { level: "warn" },
        ),
        await sleep(S));
    }
}
//@ chunk-e6aww6q8.js:4380532-4380631 placement
async function b_s(e, n, r) {
  if (isStorageV5Enabled() && n !== void 0 && r !== null) return;
  await mkdir_23(e, { recursive: !0, mode: 448 });
}
/**
 * 从组织市场下载插件二进制资源。
 */
//@ chunk-e6aww6q8.js:4380631-4381579 placement
async function fetchPluginAsset(e, n, r) {
  let s = await apiClient
    .get(`/api/organizations/:orgUUID/marketplace/plugin-assets/${e}`, {
      auth: "teleport-org",
      responseType: "stream",
      timeout: n,
      validateStatus: () => !0,
      credentials: r,
      headers: { accept: "application/octet-stream", "anthropic-beta": OAUTH_BETA_HEADER },
    })
    .catch((y) => {
      if (getErrnoCode(y) === void 0) throw y;
      throw new PluginAssetFetchError(
        `asset fetch failed: ${y instanceof Error ? y.message : String(y)}`,
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
  let { status: status } = s;
  if (status !== 200) {
    if ((s.data.destroy(), status === 404))
      throw new PluginAssetFetchError("asset not found (404)", "asset_not_found", status);
    if (status === 410) throw new PluginAssetFetchError("asset denylisted (410)", "asset_denylisted", status);
    if (status >= 500)
      throw new PluginAssetFetchError(`asset fetch failed (${status})`, "asset_transient", status);
    throw new PluginAssetFetchError(`unexpected asset response (${status})`, "asset_http_error", status);
  }
  return s.data;
}
/**
 * 下载资源并校验固定的 sha256。
 */
//@ chunk-e6aww6q8.js:4381579-4382434 placement
function downloadAssetWithDigest(e, n, r, s) {
  let h = createHash_22("sha256"),
    y = 0,
    S;
  function w() {
    (clearTimeout(S), (S = setTimeout((we) => we.destroy(Error("asset download stream stalled")), r, e)));
  }
  let L;
  function G(we) {
    L = we;
  }
  e.once("error", G);
  let q = !1;
  function Z() {
    if ((e.off("error", G), clearTimeout(S), !q)) e.destroy();
  }
  function Se() {
    if (h.digest("hex") !== n)
      throw new PluginAssetFetchError(
        "downloaded bytes do not match the pinned sha256",
        "asset_digest_mismatch",
      );
  }
  async function* ke() {
    try {
      if ((e.off("error", G), L !== void 0)) throw L;
      w();
      for await (let we of e) {
        w();
        let Ee = Buffer.isBuffer(we) ? we : Buffer.from(we);
        if (((y += Ee.length), y > MAX_ASSET_BYTES))
          throw new PluginAssetFetchError("asset exceeds size cap", "asset_too_large");
        (h.update(Ee), yield Ee);
      }
      if ((clearTimeout(S), s)) Se();
      q = !0;
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
  return { chunks: ke(), verifyDigest: Se, abort: Z };
}
/**
 * 流式下载资源到新文件并校验摘要，失败删除。
 */
//@ chunk-e6aww6q8.js:4382434-4382943 placement
async function downloadAssetToFile(e, n, r, s) {
  let h = downloadAssetWithDigest(await fetchPluginAsset(e, r, s), e, r, !1),
    y,
    S;
  try {
    y = await open_23(n, "wx", 384);
    for await (let chunk of h.chunks) await y.write(chunk);
    await y.sync().catch(() => {
      return;
    });
  } catch (error) {
    ((S = error), h.abort());
  } finally {
    await y?.close().catch(() => {
      return;
    });
  }
  if (S !== void 0) {
    if (
      (await rm_25(n, { force: !0 }).catch(() => {
        return;
      }),
      S instanceof PluginAssetFetchError)
    )
      throw S;
    throw new PluginAssetFetchError(
      `asset download failed: ${S instanceof Error ? S.message : String(S)}`,
      "asset_transient",
    );
  }
  try {
    h.verifyDigest();
  } catch (error) {
    throw (
      await rm_25(n, { force: !0 }).catch(() => {
        return;
      }),
      error
    );
  }
}
//@ chunk-e6aww6q8.js:4382943-4383113 placement
function createAssetStream(e, n, r) {
  let s,
    h = !1;
  async function* y() {
    h = !0;
    try {
      yield* downloadAssetWithDigest(await fetchPluginAsset(e, n, r), e, n, !0).chunks;
    } catch (error) {
      throw ((s = error), error);
    }
  }
  return { chunks: y(), failure: () => s, started: () => h };
}
/**
 * 把一个二进制资源放到目标位置，经存储接口失败时报错。
 */
//@ chunk-e6aww6q8.js:4383113-4384130 placement
async function placePluginBinaryAsset(e, n, r, s, h, y, S) {
  if (isStorageV5Enabled() && y !== void 0 && S !== null && getPlatform() !== "windows") {
    let copy = await y.copy(STORAGE_SPACES.pluginAssetCache(h), Z6(S, s), {
      exactMode: 493,
      parent: "mustExist",
    });
    if (!copy.ok) {
      let q = `placement through the storage interface failed: ${formatStorageError(copy.error)}`,
        Z = copy.error.code === "NotFound" ? "ENOENT" : errnoShapedCode(storageErrorCode(copy.error));
      if (Z === void 0) throw new PluginAssetFetchError(q, "asset_place_failed");
      throw Object.assign(
        new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
          q,
          "placement through the storage interface failed",
        ),
        { code: Z },
      );
    }
    return;
  }
  let w = join_120(r, s),
    L = join_120(n, `.place-${s}-${makePidRandomId()}`);
  try {
    if ((await copyFile_5(e, L, constants_24.COPYFILE_EXCL), getPlatform() !== "windows")) {
      let Z = await open_23(L, $c());
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
    let G = join_120(r, `.place-${s}-${makePidRandomId()}`),
      q = !1;
    try {
      (await copyFile_5(L, G, constants_24.COPYFILE_EXCL), await renameReplacing(G, w), (q = !0));
    } finally {
      if (!q)
        await rm_25(G, { force: !0 }).catch(() => {
          return;
        });
    }
  } finally {
    await rm_25(L, { force: !0 }).catch(() => {
      return;
    });
  }
}
/**
 * 用硬链接（或存储共享复制）把缓存资源放进 bin 并校验。
 */
//@ chunk-e6aww6q8.js:4384130-4384584 placement
async function linkAssetIntoBin(e, n, r, s, h, y) {
  if (getPlatform() === "windows") return "failed_clean";
  let S = join_120(e, n),
    w = join_120(e, r);
  if (isStorageV5Enabled() && h !== void 0 && y !== null) {
    let G = await shareCopyAsset(h, y, n, r);
    if (G !== "created") return G;
    return (await verifyPlacedAsset(w, s, { ensureMode: 493, guestWritable: !0 }, h, Z6(y, r))) === "match"
      ? "placed"
      : "failed_created";
  }
  try {
    await link_3(S, w);
  } catch (error) {
    if (getErrnoCode(error) === "EEXIST") return "exists";
    return "failed_clean";
  }
  return (await verifyPlacedAsset(w, s, { ensureMode: 493, guestWritable: !0 })) === "match"
    ? "placed"
    : "failed_created";
}
/**
 * 存储层共享复制资源（ifAbsent），映射结果。
 */
//@ chunk-e6aww6q8.js:4384584-4385151 placement
async function shareCopyAsset(e, n, r, s) {
  let h = Z6(n, r),
    copy = await e.copy(h, Z6(n, s), {
      precondition: { type: "ifAbsent" },
      parent: "mustExist",
      share: "require",
    });
  if (copy.ok) return copy.value.shared ? "created" : "failed_created";
  let error = copy.error;
  if (error.code === "AlreadyExists") return "exists";
  if (
    error.code === "Unavailable" &&
    (error.telemetryCode === LINKMISDIRECTED || error.telemetryCode === LINKUNVERIFIED)
  )
    return "failed_created";
  if (error.code !== "Failed" || error.key === void 0) return "failed_clean";
  let w = storageErrorCode(error);
  if (JOi(error.key, h)) return w === "ELOOP" || w === "ENXIO" ? "refused_source" : "failed_clean";
  return w === "ELOOP" || w === "EISDIR" || w === "ENXIO" ? "exists" : "failed_clean";
}
//@ chunk-e6aww6q8.js:4385151-4385310 placement
async function renameReplacing(e, n) {
  try {
    await rename_5(e, n);
  } catch (error) {
    let s = getErrnoCode(error);
    if (s === "EXDEV" || s === void 0) throw error;
    if (!AI.has(s)) throw error;
    (await rm_25(n, { force: !0 }), await rename_5(e, n));
  }
}
/**
 * 清理目录中过期的临时文件（点文件与普通文件不同期限；存储后端模式走存储层）。
 */
//@ chunk-e6aww6q8.js:4385310-4385619 placement = convertDirectoryToZipInPlace (0.79)
async function sweepStaleTempFiles(e, n, r) {
  if (isStorageV5Enabled() && n !== void 0 && r !== null) return sweepExpiredStorageEntries(e, n, r);
  let s;
  try {
    s = await readdir_27(e);
  } catch {
    return;
  }
  let now = Date.now();
  for (let y of s) {
    let S = join_120(e, y),
      w = await lstat_37(S).catch(() => null);
    if (!w) continue;
    let L = y.startsWith(".") ? TEMP_FILE_TTL_MS : ASSET_CACHE_TTL_MS;
    if (now - w.mtimeMs > L)
      await rm_25(S, { recursive: !0, force: !0 }).catch(() => {
        return;
      });
  }
}
//@ chunk-e6aww6q8.js:4385619-4385888 placement
async function sweepExpiredStorageEntries(e, n, r) {
  let now = Date.now(),
    h;
  do {
    let listEntries = await n.listEntries(r, { cursor: h });
    if (!listEntries.ok) break;
    for (let item of listEntries.value.items)
      if (item.kind === "key" && item.mtimeMs !== void 0 && now - item.mtimeMs > ASSET_CACHE_TTL_MS)
        await n.delete(item.key);
    h = listEntries.value.cursor;
  } while (h);
  await convertDirectoryToZipInPlace_2(e, (y) => y.startsWith("."));
}
//@ chunk-e6aww6q8.js:4385888-4386116 placement = convertDirectoryToZipInPlace (0.79)
async function convertDirectoryToZipInPlace_2(dirPath, zipPath) {
  let r;
  try {
    r = await readdir_27(dirPath);
  } catch {
    return;
  }
  let now = Date.now();
  for (let h of r.filter(zipPath)) {
    let y = join_120(dirPath, h),
      S = await lstat_37(y).catch(() => null);
    if (S && now - S.mtimeMs > TEMP_FILE_TTL_MS)
      await rm_25(y, { recursive: !0, force: !0 }).catch(() => {
        return;
      });
  }
}
//@ chunk-e6aww6q8.js:4386116-4386180 placement = generatePlaceholders (0.792)
function makePidRandomId() {
  return `${process.pid}-${randomBytes_10(6).toString("hex")}`;
}
/**
 * 若路径正是插件资源缓存目录（`<配置目录>/plugins/asset-cache`），返回存储命名空间 pluginAssetCache，否则 null。
 */
//@ chunk-f3qhjfah.js:4072-4167 placement
function ngi(e) {
  return e === join_2(getClaudeConfigDir(), "plugins", "asset-cache")
    ? { namespace: "pluginAssetCache" }
    : null;
}

export { provisionBinaryAssets, Xct };
