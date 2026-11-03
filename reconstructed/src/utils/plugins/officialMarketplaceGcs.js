/**
 * utils/plugins/officialMarketplaceGcs.ts
 *
 * 从 downloads.claude.ai 的 GCS 镜像获取官方市场（latest 指针 + zip），失败分类。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/plugins/officialMarketplaceGcs.ts
 * pieces: chunk-e6aww6q8.js (4)
 * attribution: fingerprint 4
 */
import {
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
} from "path";
import {
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
  rename,
  rename as rename_2,
  rename as rename_3,
  rename as rename_4,
  rename as rename_5,
  rename as rename_6,
  rename as rename_7,
} from "fs/promises";
import { logForDebugging } from "../debug.js";
import { waitForScrollIdle, isDiskless } from "../../bootstrap/state.js";
import { t3 } from "../nativeInstaller/downloadsClient.js";
import { ICt } from "./cacheUtils.js";
import { isStorageV5Enabled } from "../hoverRest.js";
import { getMarketplaceStorageKey } from "./pluginDirectories.js";
import { lit as lit_2, fromEnum, concatSafe, fromNumber } from "../../services/analytics/safeMetadata.js";
import { unzipFile, parseZipModes, DEFAULT_FILE_MODE } from "../dxt/zip.js";
import { getErrnoCode, errorMessage, sanitizeErrnoTokenForTelemetry } from "../errors.js";
import { logEvent } from "../../services/analytics/index.js";
import { ye } from "../startupMarks.js";
import { isAxiosError } from "../../../vendor/axios/dist/esm/axios.js";

//@ chunk-e6aww6q8.js:4204213-4204348 fingerprint = GCS_BASE (0.667)
var OFFICIAL_MARKETPLACE_GCS_URL =
    "https://downloads.claude.ai/claude-code-releases/plugins/claude-plugins-official",
  MARKETPLACES_CLAUDE_PLUGINS_OFFICIAL = "marketplaces/claude-plugins-official/";
/**
 * 从 GCS 镜像（downloads.claude.ai/.../claude-plugins-official）下载官方市场：读 latest 指针，sha 未变则跳过，否则下载 zip 解压到市场缓存目录并写 .gcs-sha；失败返回 null 由调用方回退 git。
 */
//@ chunk-e6aww6q8.js:4204348-4206218 fingerprint = fetchOfficialMarketplaceFromGcs (0.882)
async function fetchOfficialMarketplaceFromGcs(e, n, r) {
  let cacheDir = resolve_55(n),
    resolvedLoc = resolve_55(e);
  if (resolvedLoc !== cacheDir && !resolvedLoc.startsWith(cacheDir + sep_67))
    return (
      logForDebugging(`fetchOfficialMarketplaceFromGcs: refusing path outside cache dir: ${e}`, {
        level: "error",
      }),
      null
    );
  await waitForScrollIdle();
  let start = performance.now(),
    outcome = "failed",
    w,
    L,
    G;
  try {
    let latest = await t3.get(`${OFFICIAL_MARKETPLACE_GCS_URL}/latest`, {
      responseType: "text",
      timeout: 1e4,
    });
    if (((w = String(latest.data).trim()), !w)) throw Error("latest pointer returned empty body");
    let Z = join_116(e, ICt),
      Se = isStorageV5Enabled() && r !== void 0 ? getMarketplaceStorageKey(Z, dirname_68(n)) : null;
    if (
      (r !== void 0 && Se !== null
        ? await r.readText([Se]).then(
            (lt) => {
              let Je = lt.ok ? lt.value.items[0] : void 0;
              return Je?.found ? Je.value.trim() : null;
            },
            () => null,
          )
        : isDiskless()
          ? null
          : await readFile_17(Z, "utf8").then(
              (lt) => lt.trim(),
              () => null,
            )) === w
    )
      return ((outcome = "noop"), w);
    if (isDiskless()) return ((G = lit_2("diskless")), null);
    let zipResp = await t3.get(`${OFFICIAL_MARKETPLACE_GCS_URL}/${w}.zip`, {
        responseType: "arraybuffer",
        timeout: 60000,
      }),
      zipBuf = Buffer.from(zipResp.data);
    L = zipBuf.length;
    let files = await unzipFile(zipBuf),
      modes = parseZipModes(zipBuf),
      staging = `${e}.staging`;
    (await rm_24(staging, { recursive: !0, force: !0 }), await mkdir_22(staging, { recursive: !0 }));
    for (let [lt, Je] of Object.entries(files)) {
      if (!lt.startsWith(MARKETPLACES_CLAUDE_PLUGINS_OFFICIAL)) continue;
      let rel = lt.slice(MARKETPLACES_CLAUDE_PLUGINS_OFFICIAL.length);
      if (!rel || rel.endsWith("/")) continue;
      let dest = join_116(staging, rel);
      (await mkdir_22(dirname_68(dest), { recursive: !0 }), await writeFile_14(dest, Je));
      let mode = modes[lt];
      if (mode && mode & 73) await chmod_4(dest, mode & DEFAULT_FILE_MODE).catch(() => {});
    }
    await writeFile_14(join_116(staging, ICt), w);
    let We = `${e}.backup`;
    await rm_24(We, { recursive: !0, force: !0 }).catch(() => {});
    let ze = !1;
    try {
      (await rename_4(e, We), (ze = !0));
    } catch (error) {
      if (getErrnoCode(error) !== "ENOENT") throw error;
    }
    try {
      await rename_4(staging, e);
    } catch (error) {
      if (ze) await rename_4(We, e).catch(() => {});
      throw error;
    }
    return (await rm_24(We, { recursive: !0, force: !0 }).catch(() => {}), (outcome = "updated"), w);
  } catch (error) {
    return (
      (G = classifyGcsError(error)),
      logForDebugging(`Official marketplace GCS fetch failed: ${errorMessage(error)}`, { level: "warn" }),
      null
    );
  } finally {
    let q = outcome;
    logEvent("tengu_plugin_remote_fetch", {
      source: lit_2("marketplace_gcs"),
      host: lit_2("downloads.claude.ai"),
      is_official: !0,
      outcome: fromEnum(q),
      duration_ms: Math.round(performance.now() - start),
      ...(L !== void 0 && { bytes: L }),
      ...(w && { sha: ye(w) }),
      ...(G && { error_kind: G }),
    });
  }
}
//@ chunk-e6aww6q8.js:4206218-4206330 fingerprint = KNOWN_FS_CODES (1)
var KNOWN_FS_CODES = new Set([
  "ENOSPC",
  "EACCES",
  "EPERM",
  "EXDEV",
  "EBUSY",
  "ENOENT",
  "ENOTDIR",
  "EROFS",
  "EMFILE",
  "ENAMETOOLONG",
]);
//@ chunk-e6aww6q8.js:4206330-4206760 fingerprint = classifyGcsError (0.978)
function classifyGcsError(e) {
  if (isAxiosError(e)) {
    if (e.code === "ECONNABORTED") return lit_2("timeout");
    if (e.response) return concatSafe(lit_2("http_"), fromNumber(e.response.status));
    return lit_2("network");
  }
  let code = getErrnoCode(e);
  if (code && /^E[A-Z]+$/.test(code) && !code.startsWith("ERR_")) {
    let s = KNOWN_FS_CODES.has(code) ? sanitizeErrnoTokenForTelemetry(code) : void 0;
    return s ? concatSafe(lit_2("fs_"), s) : lit_2("fs_other");
  }
  let msg = errorMessage(e);
  if (/unzip|invalid zip|central directory/i.test(msg)) return lit_2("zip_parse");
  if (/empty body/.test(msg)) return lit_2("empty_latest");
  return lit_2("other");
}

export { fetchOfficialMarketplaceFromGcs };
