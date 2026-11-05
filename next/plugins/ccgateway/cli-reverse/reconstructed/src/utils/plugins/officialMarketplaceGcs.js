/**
 * utils/plugins/officialMarketplaceGcs.ts
 *
 * 从 downloads.claude.ai 的 GCS 镜像获取官方市场（latest 指针 + zip），失败分类。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/plugins/officialMarketplaceGcs.ts
 * pieces: chunk-5xgkngpb.js (4)
 * attribution: fingerprint 4
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { resolve as resolve_2, sep, join, dirname } from "path";
import { readFile, rm, mkdir, writeFile, chmod, rename } from "fs/promises";
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
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-5xgkngpb.js:4310615-4310750 fingerprint (2.1.88 match: GCS_BASE, 0.667)
var OFFICIAL_MARKETPLACE_GCS_URL =
  "https://downloads.claude.ai/claude-code-releases/plugins/claude-plugins-official";
var MARKETPLACES_CLAUDE_PLUGINS_OFFICIAL = "marketplaces/claude-plugins-official/";
//@ chunk-5xgkngpb.js:4310750-4312623 fingerprint (2.1.88 match: fetchOfficialMarketplaceFromGcs, 0.882)
/**
 * 从 GCS 镜像（downloads.claude.ai/.../claude-plugins-official）下载官方市场：读 latest 指针，sha 未变则跳过，否则下载 zip 解压到市场缓存目录并写 .gcs-sha；失败返回 null 由调用方回退 git。
 */
async function fetchOfficialMarketplaceFromGcs(installLocation, marketplacesCacheDir, storageV5) {
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
    let markerPath = join(installLocation, GCS_SHA_MARKER_FILE);
    let storageKey =
      isStorageV5Enabled() && storageV5 !== undefined
        ? getMarketplaceStorageKey(markerPath, dirname(marketplacesCacheDir))
        : null;
    if (
      (storageV5 !== undefined && storageKey !== null
        ? await storageV5.readText([storageKey]).then(
            (readResult) => {
              let item = readResult.ok ? readResult.value.items[0] : undefined;
              return item?.found ? item.value.trim() : null;
            },
            () => null,
          )
        : isDiskless()
          ? null
          : await readFile(markerPath, "utf8").then(
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
    await rm(staging, {
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
    let backupPath = `${installLocation}.backup`;
    await rm(backupPath, {
      recursive: true,
      force: true,
    }).catch(() => {});
    let movedAside = false;
    try {
      await rename(installLocation, backupPath);
      movedAside = true;
    } catch (error) {
      if (getErrnoCode(error) !== "ENOENT") throw error;
    }
    try {
      await rename(staging, installLocation);
    } catch (error) {
      if (movedAside) await rename(backupPath, installLocation).catch(() => {});
      throw error;
    }
    await rm(backupPath, {
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
    let finalOutcome = outcome;
    logEvent("tengu_plugin_remote_fetch", {
      source: lit_2("marketplace_gcs"),
      host: lit_2("downloads.claude.ai"),
      is_official: true,
      outcome: fromEnum(finalOutcome),
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
//@ chunk-5xgkngpb.js:4312623-4312735 fingerprint (2.1.88 match: KNOWN_FS_CODES, 1)
var KNOWN_FS_CODES; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-5xgkngpb.js:4312623", () => {
  KNOWN_FS_CODES = new Set([
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
});
//@ chunk-5xgkngpb.js:4312735-4313165 fingerprint (2.1.88 match: classifyGcsError, 0.978)
function classifyGcsError(error) {
  if (isAxiosError(error)) {
    if (error.code === "ECONNABORTED") return lit_2("timeout");
    if (error.response) return concatSafe(lit_2("http_"), fromNumber(error.response.status));
    return lit_2("network");
  }
  let code = getErrnoCode(error);
  if (code && /^E[A-Z]+$/.test(code) && !code.startsWith("ERR_")) {
    let knownCode = KNOWN_FS_CODES.has(code) ? sanitizeErrnoTokenForTelemetry(code) : undefined;
    return knownCode ? concatSafe(lit_2("fs_"), knownCode) : lit_2("fs_other");
  }
  let msg = errorMessage(error);
  if (/unzip|invalid zip|central directory/i.test(msg)) return lit_2("zip_parse");
  if (/empty body/.test(msg)) return lit_2("empty_latest");
  return lit_2("other");
}
export { fetchOfficialMarketplaceFromGcs };
