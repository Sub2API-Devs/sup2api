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
import { resolve as resolve_2, sep, join, dirname } from "path";
import { readFile, rm as rm_2, mkdir, writeFile, chmod, rename } from "fs/promises";
import { logForDebugging } from "../debug.js";
import { waitForScrollIdle, isDiskless } from "../../bootstrap/state.js";
import { publicCdnGuardedClient } from "../nativeInstaller/downloadsClient.js";
import { GCS_SHA_MARKER_FILE } from "./cacheUtils.js";
import { isStorageV5Enabled } from "../hoverRest.js";
import { getMarketplaceStorageKey } from "./pluginDirectories.js";
import { lit as lit_2, fromEnum, concatSafe, fromNumber } from "../../services/analytics/safeMetadata.js";
import { unzipFile, parseZipModes, DEFAULT_FILE_MODE } from "../dxt/zip.js";
import { getErrnoCode, errorMessage, sanitizeErrnoTokenForTelemetry } from "../errors.js";
import { logEvent } from "../../services/analytics/index.js";
import { sanitizeMarkName } from "../startupMarks.js";
import { isAxiosError } from "../../../vendor/axios/dist/esm/axios.js";

//@ chunk-e6aww6q8.js:4204213-4204348 fingerprint = GCS_BASE (0.667)
var OFFICIAL_MARKETPLACE_GCS_URL =
  "https://downloads.claude.ai/claude-code-releases/plugins/claude-plugins-official";
var MARKETPLACES_CLAUDE_PLUGINS_OFFICIAL = "marketplaces/claude-plugins-official/";
//@ chunk-e6aww6q8.js:4204348-4206218 fingerprint = fetchOfficialMarketplaceFromGcs (0.882)
/**
 * 从 GCS 镜像（downloads.claude.ai/.../claude-plugins-official）下载官方市场：读 latest 指针，sha 未变则跳过，否则下载 zip 解压到市场缓存目录并写 .gcs-sha；失败返回 null 由调用方回退 git。
 */
async function fetchOfficialMarketplaceFromGcs(installLocation, marketplacesCacheDir, r) {
  let cacheDir = resolve_2(marketplacesCacheDir);
  let resolvedLoc = resolve_2(installLocation);
  if (resolvedLoc !== cacheDir && !resolvedLoc.startsWith(cacheDir + sep)) {
    logForDebugging(`fetchOfficialMarketplaceFromGcs: refusing path outside cache dir: ${installLocation}`, {
      level: "error",
    });
    return null;
  }
  await waitForScrollIdle();
  let start = performance.now();
  let outcome = "failed";
  let sha;
  let bytes;
  let errKind;
  try {
    let latest = await publicCdnGuardedClient.get(`${OFFICIAL_MARKETPLACE_GCS_URL}/latest`, {
      responseType: "text",
      timeout: 1e4,
    });
    sha = String(latest.data).trim();
    if (!sha) throw Error("latest pointer returned empty body");
    let Z = join(installLocation, GCS_SHA_MARKER_FILE);
    let Se =
      isStorageV5Enabled() && r !== undefined
        ? getMarketplaceStorageKey(Z, dirname(marketplacesCacheDir))
        : null;
    if (
      (r !== undefined && Se !== null
        ? await r.readText([Se]).then(
            (lt) => {
              let Je = lt.ok ? lt.value.items[0] : undefined;
              return Je?.found ? Je.value.trim() : null;
            },
            () => null,
          )
        : isDiskless()
          ? null
          : await readFile(Z, "utf8").then(
              (file) => file.trim(),
              () => null,
            )) === sha
    ) {
      outcome = "noop";
      return sha;
    }
    if (isDiskless()) {
      errKind = lit_2("diskless");
      return null;
    }
    let zipResp = await publicCdnGuardedClient.get(`${OFFICIAL_MARKETPLACE_GCS_URL}/${sha}.zip`, {
      responseType: "arraybuffer",
      timeout: 60000,
    });
    let zipBuf = Buffer.from(zipResp.data);
    bytes = zipBuf.length;
    let files = await unzipFile(zipBuf);
    let modes = parseZipModes(zipBuf);
    let staging = `${installLocation}.staging`;
    await rm_2(staging, {
      recursive: true,
      force: true,
    });
    await mkdir(staging, {
      recursive: true,
    });
    for (let [arcPath, data] of Object.entries(files)) {
      if (!arcPath.startsWith(MARKETPLACES_CLAUDE_PLUGINS_OFFICIAL)) continue;
      let rel = arcPath.slice(MARKETPLACES_CLAUDE_PLUGINS_OFFICIAL.length);
      if (!rel || rel.endsWith("/")) continue;
      let dest = join(staging, rel);
      await mkdir(dirname(dest), {
        recursive: true,
      });
      await writeFile(dest, data);
      let mode = modes[arcPath];
      if (mode && mode & 73) await chmod(dest, mode & DEFAULT_FILE_MODE).catch(() => {});
    }
    await writeFile(join(staging, GCS_SHA_MARKER_FILE), sha);
    let We = `${installLocation}.backup`;
    await rm_2(We, {
      recursive: true,
      force: true,
    }).catch(() => {});
    let ze = false;
    try {
      await rename(installLocation, We);
      ze = true;
    } catch (error) {
      if (getErrnoCode(error) !== "ENOENT") throw error;
    }
    try {
      await rename(staging, installLocation);
    } catch (error) {
      if (ze) await rename(We, installLocation).catch(() => {});
      throw error;
    }
    await rm_2(We, {
      recursive: true,
      force: true,
    }).catch(() => {});
    outcome = "updated";
    return sha;
  } catch (e) {
    errKind = classifyGcsError(e);
    logForDebugging(`Official marketplace GCS fetch failed: ${errorMessage(e)}`, {
      level: "warn",
    });
    return null;
  } finally {
    let q = outcome;
    logEvent("tengu_plugin_remote_fetch", {
      source: lit_2("marketplace_gcs"),
      host: lit_2("downloads.claude.ai"),
      is_official: true,
      outcome: fromEnum(q),
      duration_ms: Math.round(performance.now() - start),
      ...(bytes !== undefined && {
        bytes,
      }),
      ...(sha && {
        sha: sanitizeMarkName(sha),
      }),
      ...(errKind && {
        error_kind: errKind,
      }),
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
    let s = KNOWN_FS_CODES.has(code) ? sanitizeErrnoTokenForTelemetry(code) : undefined;
    return s ? concatSafe(lit_2("fs_"), s) : lit_2("fs_other");
  }
  let msg = errorMessage(e);
  if (/unzip|invalid zip|central directory/i.test(msg)) return lit_2("zip_parse");
  if (/empty body/.test(msg)) return lit_2("empty_latest");
  return lit_2("other");
}
export { fetchOfficialMarketplaceFromGcs };
