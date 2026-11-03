/**
 * utils/nativeInstaller/download.ts
 *
 * 原生安装器的下载：版本清单、签名校验（RSASSA-PKCS1-v1_5-SHA512）、校验和与重试
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/nativeInstaller/download.ts
 * pieces: chunk-zw17mz74.js (40)
 * attribution: placement 15, layout 19, fingerprint 5, callgraph-witnessed 1
 */
import { createPublicKey, createHash, createHash as createHash_2, verify } from "crypto";
import { Transform, Readable } from "stream";
import { createWriteStream, createReadStream } from "fs";
import { pipeline } from "stream/promises";
import { createZstdDecompress } from "zlib";
import { chmod, chmod as chmod_2, rm, rm as rm_2 } from "fs/promises";
import { join, join as join_2, join as join_3 } from "path";
import { DoctorLazy } from "../../cli/handlers/util.js";
import { u, T, o, kt, pe, E } from "../../../vendor/zod/v4/classic/schemas.js";
import {
  TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
  hasExactErrorMessage,
  getErrnoCode,
  toError,
  errorMessage,
} from "../errors.js";
import { jsonParse } from "../slowOperations.js";
import { isAnthropicOwnedHost } from "../anthropicHosts.js";
import { t3 } from "./downloadsClient.js";
import { externalHttp } from "../../services/http/externalHttp.js";
import { retryWithTimeout } from "../autoUpdater.js";
import { logForDebugging } from "../debug.js";
import { logFeatureBad, logFeatureSad, logFeatureOk } from "../../services/analytics/featureTelemetry.js";
import { logEvent } from "../../services/analytics/index.js";
import { X4 } from "../../services/analytics/metadata.js";
import { fromEnum } from "../../services/analytics/safeMetadata.js";
import { hto } from "../model/modelCatalog/catalogCapabilities.js";
import { env } from "../env.js";
import { isAxiosError, isCancel } from "../../../vendor/axios/dist/esm/axios.js";
import { extractConnectionErrorDetails, LK, PU } from "../../services/api/errorUtils.js";
import { sleep } from "../sleep.js";
import {
  getFeatureValue_CACHED_MAY_BE_STALE,
  initializeGrowthBook,
} from "../../services/analytics/growthbook.js";
import { getBinaryName, getPlatform } from "./installer.js";
import { getFsImplementation } from "../fsOperations.js";
import { lt_2 } from "../semver.js";
import { isEnvDefinedFalsy } from "../envUtils.js";

//@ chunk-zw17mz74.js:2482-3305 placement
function verifyReleaseManifest() {
  return `-----BEGIN PUBLIC KEY-----
MIICIjANBgkqhkiG9w0BAQEFAAOCAg8AMIICCgKCAgEAp28rSV5I8HmK8CK9GixB
UZR/gtJxeOCsRXO4EJiej40jzBmQA3cWXGosVO82ZfFsRKVTtMC5iB/HH9sxjncr
mYNWGroJNbx29m/FgYQBgkCXT4AfFl6rnnXqRGLZOerj/4AqE4yQ1GZbhBgR55Z7
ro0ieKK8RHYUspBKAFHyWRhCCz6THW6YRbf0p/hG/08TOY6Sj3cJ7/AEoTRf9ZmV
NX1k0KvbUSiVGpGY9OIHWgxRJUF2pArU4o/hk+sqGAgEUh8Bjvjwvz6+quLXPg+y
0Y8Ugb1Fg6BUppam/zydYY/Q/+yNjnuF154gD1jEeeir8R5czs6zUHSbo2yXUpAs
IdWYo5End8vGsluVmFExnUWm/fTVMGoM5Wm3v1VRepMydEnJ+atz4oQdmPQcKNAi
p5GJO2uyk++xFr9CpKvlR5jral92toYV/m+mur3va8ydamWBo/qG7/wt0sdS81Iw
H6lcu0SQ39rgKD+bdoPLv05EqVMYTFRI2QZEsWGYTMs0DOrfCIJFH50qyD0x4sWw
1gEWeG3jDgY8cj2StZz+zjqzUd05CibcCzEAGm1EQg5y9D40tIsAU1OI7bpgQ9V0
lC8lrqE7zJY66UK9Z1daA8jrdDi6migNjHFrXfT3V4QvMthCIO05q05SS3x2G3Zp
IgmI+CePUPB1pDf+lhPkU1MCAwEAAQ==
-----END PUBLIC KEY-----
`;
}
//@ chunk-zw17mz74.js:3305-3378 placement
var buffer = Buffer.from("claude-code-manifest-v1\x00"),
  Te = "2.1.207",
  FLAG = "flag";
//@ chunk-zw17mz74.js:3378-3677 placement
var MANIFEST_SIGNATURE_VERSION = 1,
  RSASSA_PKCS1_V1_5_SHA512 = "RSASSA-PKCS1-v1_5-SHA512",
  Vt = DoctorLazy(() =>
    u({
      schema: T(MANIFEST_SIGNATURE_VERSION),
      algorithm: T(RSASSA_PKCS1_V1_5_SHA512),
      signature: o().min(1),
      publicKeySha256: o().regex(/^[0-9a-f]{64}$/),
    }),
  ),
  Ce = DoctorLazy(() =>
    kt({
      version: o(),
      manifestSignatureEnforcement: o().optional(),
      platforms: pe(o(), kt({ checksum: o(), size: E().optional(), binary: o().optional() })),
    }),
  );
//@ chunk-zw17mz74.js:3677-3917 placement
class ManifestSignatureError extends TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS {
  reason;
  constructor(e, n) {
    super(
      `Release verification failed for Claude Code ${e} (${n}). The update was not installed.`,
      "Release manifest signature verification failed",
      n,
    );
    ((this.name = "ManifestSignatureError"), (this.reason = n));
  }
}
/**
 * 校验发布清单的签名附件（格式、密钥不符、签名无效、版本不符）。
 */
//@ chunk-zw17mz74.js:3917-4656 placement
function verifyManifestSidecar({
  manifestBytes: manifestBytes,
  sidecar: sidecar,
  expectedVersion: expectedVersion,
  publicKeyPem: publicKeyPem,
}) {
  let safeParse = Vt().safeParse(sidecar);
  if (!safeParse.success) throw new ManifestSignatureError(expectedVersion, "sidecar_malformed");
  let { signature: signature, publicKeySha256: publicKeySha256 } = safeParse.data;
  if (Buffer.from(signature, "base64").toString("base64") !== signature)
    throw new ManifestSignatureError(expectedVersion, "sidecar_malformed");
  let y;
  try {
    y = createPublicKey(publicKeyPem);
  } catch {
    throw new ManifestSignatureError(expectedVersion, "key_mismatch");
  }
  let digest = createHash_2("sha256")
    .update(y.export({ type: "spki", format: "der" }))
    .digest("hex");
  if (publicKeySha256 !== digest) throw new ManifestSignatureError(expectedVersion, "key_mismatch");
  let R = !1;
  try {
    R = verify("sha512", Buffer.concat([buffer, manifestBytes]), y, Buffer.from(signature, "base64"));
  } catch {
    R = !1;
  }
  if (!R) throw new ManifestSignatureError(expectedVersion, "signature_invalid");
  let F;
  try {
    let safeParse = Ce().safeParse(jsonParse(manifestBytes.toString("utf8")));
    F = safeParse.success ? safeParse.data : void 0;
  } catch {
    F = void 0;
  }
  if (!F || F.version !== expectedVersion)
    throw new ManifestSignatureError(expectedVersion, "version_mismatch");
  return F;
}
//@ chunk-zw17mz74.js:4656-4728 placement
var Ie = "https://downloads.claude.ai/claude-code-releases",
  qe = 30000,
  Ke = 3;
//@ chunk-zw17mz74.js:4728-4749 placement
class ZNo extends TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS {}
//@ chunk-zw17mz74.js:4749-4803 layout
function httpGet(e, n) {
  return isAnthropicOwnedHost(e) ? t3.get(e, n) : externalHttp.get(e, n);
}
/**
 * 从二进制仓库读 stable/latest 通道的版本号（带重试）。
 */
//@ chunk-zw17mz74.js:4803-5961 fingerprint = getLatestVersionFromBinaryRepo (0.413)
async function getLatestVersionFromBinaryRepo(channel = "latest", baseUrl, authConfig) {
  let startTime = Date.now(),
    h = 0,
    w;
  try {
    w = await retryWithTimeout(
      (R) => (
        h++,
        httpGet(`${baseUrl}/${channel}`, { timeout: qe, responseType: "text", signal: R, ...authConfig })
      ),
      {
        attempts: Ke,
        timeoutMs: qe,
        onRetry: (R, F) => {
          logForDebugging(
            `Version check failed on attempt ${R}/${Ke}, retrying: ${F instanceof Error ? F.message : String(F)}`,
          );
        },
      },
    );
  } catch (error) {
    let F = Date.now() - startTime,
      errorMessage = error instanceof Error ? error.message : String(error),
      O = httpStatusOf(error);
    (logFeatureBad("update_check", "update_check_binary_repo_failed"),
      logEvent("tengu_version_check_failure", {
        latency_ms: F,
        http_status: O,
        is_timeout: isTimeoutError(error),
        attempt: h,
        platform: X4(sn()),
        channel: fromEnum(channel),
      }));
    let L = new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `Failed to fetch version from ${baseUrl}/${channel} after ${h} attempt(s): ${errorMessage}`,
      "Failed to fetch version from binary repo",
    );
    throw (
      logForDebugging(
        `Failed to fetch version from ${baseUrl}/${channel} after ${h} attempt(s): ${errorMessage}`,
        { level: "error" },
      ),
      L
    );
  }
  let b = Date.now() - startTime,
    trimmed = w.data.trim(),
    S = trimmed.length;
  if (!hto(trimmed))
    throw (
      logFeatureBad("update_check", "update_check_binary_repo_invalid_response"),
      new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `Version pointer for ${channel} did not return a version (got ${S} bytes)`,
        "Version pointer returned a non-version body",
      )
    );
  if ((logEvent("tengu_version_check_success", { latency_ms: b, attempt: h }), h > 1))
    logFeatureSad("update_check", "update_check_binary_repo_retry");
  else logFeatureOk("update_check");
  return trimmed;
}
/**
 * 把 stable/latest/具体版本解析为要安装的版本号（拒绝 99.99.* 测试版本）。
 */
//@ chunk-zw17mz74.js:5961-6486 fingerprint = getLatestVersion (0.716)
async function getLatestVersion(channelOrVersion) {
  if (/^v?\d+\.\d+\.\d+(-\S+)?$/.test(channelOrVersion)) {
    let r = channelOrVersion.startsWith("v") ? channelOrVersion.slice(1) : channelOrVersion;
    if (/^99\.99\./.test(r))
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `Version ${r} is not available for installation. Use 'stable' or 'latest'.`,
        "Test-fixture version rejected outside test builds",
      );
    return r;
  }
  let channel = channelOrVersion;
  if (channel !== "stable" && channel !== "latest" && channel !== "rc")
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `Invalid channel: ${channelOrVersion}. Use 'latest' or 'stable'`,
      "Invalid release channel",
    );
  if (channel === "rc")
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `Invalid channel: ${channelOrVersion}. Use 'stable' or 'latest'`,
      "Invalid release channel",
    );
  return getLatestVersionFromBinaryRepo(channel, Ie);
}
//@ chunk-zw17mz74.js:6486-6566 layout
var npmManifestSchema = DoctorLazy(() =>
  u({ dist: u({ integrity: o().min(1), tarball: o().min(1).optional() }) }),
);
//@ chunk-zw17mz74.js:6566-6632 layout
var DEFAULT_STALL_TIMEOUT_MS = 120000,
  MAX_DOWNLOAD_RETRIES = 3,
  DOWNLOAD_DEADLINE_MS = 600000,
  VERSION_CHECK_TIMEOUT_MS = 1e4,
  RETRY_BASE_DELAY_MS = 1000,
  VERSION_CHECK_BUDGET_MS = MAX_DOWNLOAD_RETRIES * (VERSION_CHECK_TIMEOUT_MS + RETRY_BASE_DELAY_MS),
  VERSION_CHECK_TOTAL_MS = 2 * VERSION_CHECK_BUDGET_MS;
//@ chunk-zw17mz74.js:6632-6708 fingerprint = getStallTimeoutMs (1)
function getStallTimeoutMs() {
  return Number(env.CLAUDE_CODE_STALL_TIMEOUT_MS_FOR_TESTING) || DEFAULT_STALL_TIMEOUT_MS;
}
//@ chunk-zw17mz74.js:6708-6788 layout
function getDownloadDeadlineMs() {
  return Number(env.CLAUDE_CODE_DOWNLOAD_DEADLINE_MS_FOR_TESTING) || DOWNLOAD_DEADLINE_MS;
}
/**
 * 下载 120 秒无数据时抛出的错误。
 */
//@ chunk-zw17mz74.js:6788-6917 fingerprint = StallTimeoutError (0.667)
class StallTimeoutError extends Error {
  constructor() {
    super("Download stalled: no data received for 120 seconds");
    this.name = "StallTimeoutError";
  }
}
//@ chunk-zw17mz74.js:6917-7098 layout
function isRetriableConnectionDrop(e) {
  if (isAxiosError(e) && e.response) return !1;
  let n = extractConnectionErrorDetails(e)?.code;
  if (n === "ECONNABORTED" || n === "ETIMEDOUT") return !1;
  if (n !== void 0 && (LK.has(n) || PU.has(n))) return !0;
  return hasExactErrorMessage(e, "aborted");
}
/**
 * 下载更新二进制（可选 zstd 解压并限制解压后大小）：边下载边算 SHA-256，带停滞超时与总截止时间；校验和不符、停滞或连接中断时有限次重试，失败时删除半成品，成功后设为可执行。
 */
//@ chunk-zw17mz74.js:7098-9731 layout
async function downloadAndVerifyBinary(url, expectedChecksum, destPath, requestOptions = {}, compressed) {
  let lastError,
    checksumRetried = !1,
    dropRetried = !1;
  for (let attempt = 1; attempt <= MAX_DOWNLOAD_RETRIES; attempt++) {
    let abortController = new AbortController(),
      streamFinished = !1,
      completed = !1,
      stallTimer,
      deadlineTimer,
      fileStream,
      clearTimers = () => {
        if (stallTimer) (clearTimeout(stallTimer), (stallTimer = void 0));
        if (deadlineTimer) (clearTimeout(deadlineTimer), (deadlineTimer = void 0));
      },
      resetStallTimer = () => {
        if (stallTimer) stallTimer.refresh();
        else stallTimer = setTimeout((x) => x.abort("stall"), getStallTimeoutMs(), abortController);
      };
    try {
      (resetStallTimer(),
        (deadlineTimer = setTimeout((j) => j.abort("deadline"), getDownloadDeadlineMs(), abortController)));
      let response = await httpGet(url, {
          timeout: DOWNLOAD_DEADLINE_MS,
          responseType: "stream",
          signal: abortController.signal,
          ...requestOptions,
        }),
        hash = createHash("sha256"),
        compressedHash = compressed ? createHash("sha256") : void 0,
        activeHash = compressedHash ?? hash,
        hashingTransform = new Transform({
          transform(j, G, K) {
            (resetStallTimer(), activeHash.update(j), K(null, j));
          },
        });
      if (
        ((fileStream = createWriteStream(destPath, { highWaterMark: 4194304 })),
        fileStream.on("drain", resetStallTimer),
        compressed)
      ) {
        let j = 0,
          G = new Transform({
            transform(K, ee, ae) {
              if (((j += K.length), j > compressed.decompressedSize)) {
                ae(
                  new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
                    `Decompressed binary exceeds the manifest size of ${compressed.decompressedSize} bytes`,
                    "Decompressed binary larger than manifest size",
                  ),
                );
                return;
              }
              (hash.update(K), ae(null, K));
            },
          });
        await pipeline(response.data, hashingTransform, createZstdDecompress(), G, fileStream, {
          signal: abortController.signal,
        });
      } else await pipeline(response.data, hashingTransform, fileStream, { signal: abortController.signal });
      if (((streamFinished = !0), clearTimers(), compressed)) {
        let j = compressedHash?.digest("hex");
        if (j !== compressed.checksum)
          throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
            `Checksum mismatch: expected ${compressed.checksum}, got ${j} (compressed)`,
            "Checksum mismatch during compressed binary download",
          );
      }
      let digest = hash.digest("hex");
      if (digest !== expectedChecksum)
        throw Object.assign(
          new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
            `Checksum mismatch: expected ${expectedChecksum}, got ${digest}`,
            "Checksum mismatch during binary download",
          ),
          { deterministic: compressed !== void 0 },
        );
      return (
        (completed = !0),
        await chmod_2(destPath, 493),
        { checksumRetried: checksumRetried, dropRetried: dropRetried }
      );
    } catch (error) {
      clearTimers();
      let normalizedError = tn(error)
        ? Object.assign(
            new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
              `Checksum mismatch: zstd decoder rejected the frame (${getErrnoCode(error)})`,
              "zstd decoder rejected the frame",
            ),
            { cause: error },
          )
        : error;
      if (isAxiosError(normalizedError) && normalizedError.response?.data instanceof Readable)
        normalizedError.response.data.destroy();
      if (fileStream && !completed) {
        let K = fileStream;
        (await new Promise((ee) => K.close(() => ee())),
          await rm_2(destPath, { force: !0 }).catch((ee) =>
            logForDebugging(
              `Failed to remove partial download: ${ee instanceof Error ? ee.message : String(ee)}`,
              { level: "error" },
            ),
          ));
      }
      let abortReason = abortController.signal.aborted ? abortController.signal.reason : void 0,
        isDeadline = abortReason === "deadline",
        isStall = !isDeadline && (abortReason === "stall" || isCancel(normalizedError));
      if (isDeadline)
        throw Object.assign(
          new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
            "Download timed out: exceeded the total deadline",
          ),
          { attempt: attempt },
        );
      let isChecksumMismatch =
          normalizedError instanceof Error && normalizedError.message.includes("Checksum mismatch"),
        isConnectionDrop =
          !streamFinished &&
          (isRetriableConnectionDrop(normalizedError) ||
            extractConnectionErrorDetails(normalizedError)?.code === "ERR_STREAM_PREMATURE_CLOSE"),
        failure = isStall ? new StallTimeoutError() : toError(normalizedError);
      if (
        ((lastError = failure),
        (isStall || isChecksumMismatch || isConnectionDrop) &&
          !rn(normalizedError) &&
          attempt < MAX_DOWNLOAD_RETRIES)
      ) {
        if (isChecksumMismatch) checksumRetried = !0;
        else if (isConnectionDrop) dropRetried = !0;
        (logForDebugging(
          `Download ${isChecksumMismatch ? "checksum mismatch" : isStall ? "stalled" : "connection dropped"} on attempt ${attempt}/${MAX_DOWNLOAD_RETRIES}, retrying...`,
        ),
          await sleep(1000));
        continue;
      }
      if (isConnectionDrop) {
        let K = getErrnoCode(failure);
        throw Object.assign(
          new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
            `The connection dropped while downloading the update (attempt ${attempt}/${MAX_DOWNLOAD_RETRIES}: ${failure.message}). Check your network \u2014 proxies sometimes cut off large downloads.`,
            "Connection dropped repeatedly during binary download",
          ),
          { attempt: attempt, connectionDrop: !0, cause: failure, ...(K && { code: K }) },
        );
      }
      throw Object.assign(failure, { attempt: attempt });
    }
  }
  throw lastError ?? Error("Download failed after all retries");
}
//@ chunk-zw17mz74.js:9731-9784 layout
function tt() {
  return getFeatureValue_CACHED_MAY_BE_STALE("tengu_elegant_pancake", null);
}
//@ chunk-zw17mz74.js:9784-9840 layout = formatRelativeTimeAgo (0.75)
function formatRelativeTimeAgo(date, options = tt()) {
  return date === "always" ? options !== !1 : options === !0;
}
//@ chunk-zw17mz74.js:9840-9864 layout
function nt() {
  return FLAG;
}
//@ chunk-zw17mz74.js:9864-9894 layout
function Zt() {
  return formatRelativeTimeAgo(nt());
}
//@ chunk-zw17mz74.js:9894-9957 layout
function Jt(e, n) {
  return e === "always" || (e === "flag" && formatRelativeTimeAgo("flag", n));
}
/**
 * 获取版本的 manifest.json 并按策略校验签名旁文件（RSASSA-PKCS1-v1_5-SHA512）：缺签名时可按旧版放行，核对二进制名与强制签名的发布时间；失败按是否强制决定抛错或告警继续，返回 manifest 与认证状态。
 */
//@ chunk-zw17mz74.js:9957-12952 layout
async function fetchReleaseManifest(
  e,
  n,
  {
    authConfig: authConfig,
    signaturePolicy: signaturePolicy,
    platform: platform,
    startTime: startTime,
    purpose: purpose = "download",
  },
) {
  let isDownload = purpose === "download",
    manifestBytes,
    manifest,
    dropRetried = !1,
    binaryName = getBinaryName(platform);
  try {
    let D = await fetchWithDropRetry(`${e}/${n}/manifest.json`, {
      timeout: VERSION_CHECK_TIMEOUT_MS,
      ...authConfig,
      responseType: "arraybuffer",
      maxContentLength: 1048576,
    });
    ((dropRetried = D.dropRetried), (manifestBytes = Buffer.from(D.data)));
    let safeParse = Ce().safeParse(jsonParse(manifestBytes.toString("utf8")));
    if (!safeParse.success)
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `Manifest for ${n} is not a valid release manifest`,
        "Release manifest failed schema validation",
      );
    manifest = safeParse.data;
  } catch (error) {
    let A = Date.now() - startTime,
      P = error instanceof Error ? error.message : String(error);
    if (isDownload) logFeatureBad("update_download", "update_download_manifest_failed");
    throw (
      logEvent("tengu_binary_manifest_fetch_failure", {
        latency_ms: A,
        http_status: httpStatusOf(error),
        is_timeout: isTimeoutError(error),
        platform: X4(platform),
      }),
      logForDebugging(`Failed to fetch manifest from ${e}/${n}/manifest.json: ${P}`, { level: "error" }),
      error
    );
  }
  let authenticated = !1,
    signatureVerified = !1;
  if (signaturePolicy !== "skip") {
    let sidecarUrl = `${e}/${n}/manifest.json.raw-sig.json`,
      now = Date.now(),
      sidecarStatus,
      enforcement;
    try {
      let sidecar,
        isUnsigned = !1;
      try {
        let V = await fetchWithDropRetry(sidecarUrl, {
          timeout: VERSION_CHECK_TIMEOUT_MS,
          ...authConfig,
          responseType: "json",
          maxContentLength: 65536,
          signal: AbortSignal.timeout(VERSION_CHECK_BUDGET_MS),
        });
        ((dropRetried ||= V.dropRetried), (sidecar = V.data));
      } catch (error) {
        if (((sidecarStatus = httpStatusOf(error)), sidecarStatus !== 404))
          throw new ManifestSignatureError(
            n,
            sidecarStatus !== void 0
              ? "sidecar_fetch_http_error"
              : Date.now() - now > VERSION_CHECK_TOTAL_MS
                ? "sidecar_fetch_interrupted"
                : isTimeoutError(error)
                  ? "sidecar_fetch_timeout"
                  : "sidecar_fetch_connection_error",
          );
        if (signaturePolicy !== "allow-unsigned-legacy")
          throw new ManifestSignatureError(n, "sidecar_missing");
        isUnsigned = !0;
      }
      if (isUnsigned)
        (logFeatureSad("update_manifest_signature", "unsigned_legacy"),
          logForDebugging(
            `No manifest signature published for ${n} (predates ${Te}); continuing with checksum-only verification`,
            { level: "warn" },
          ));
      else {
        let V = verifyManifestSidecar({
          manifestBytes: manifestBytes,
          sidecar: sidecar,
          expectedVersion: n,
          publicKeyPem: verifyReleaseManifest(),
        });
        logForDebugging(`Verified manifest signature for ${n}`);
        let q = V.platforms[platform];
        if (q && q.binary !== binaryName) throw new ManifestSignatureError(n, "binary_name_mismatch");
        if (((manifest = V), (authenticated = !0), signaturePolicy === "require-enforcing-release")) {
          if (
            (await initializeGrowthBook().catch(() => null),
            (enforcement = { flag: tt() }),
            !Jt(V.manifestSignatureEnforcement, enforcement.flag))
          )
            throw new ManifestSignatureError(n, "release_predates_enforcement");
        }
        ((signatureVerified = !0), logFeatureOk("update_manifest_signature"));
      }
    } catch (error) {
      if (!(error instanceof ManifestSignatureError)) throw error;
      let U = Date.now() - now;
      await initializeGrowthBook().catch(() => null);
      let V = enforcement ? formatRelativeTimeAgo(nt(), enforcement.flag) : Zt();
      if (
        (logEvent("tengu_binary_manifest_signature_failed", {
          reason: fromEnum(error.reason),
          http_status: sidecarStatus,
          enforced: V,
          platform: X4(platform),
          latency_ms: U,
        }),
        V)
      ) {
        if (error.reason === "release_predates_enforcement")
          (logFeatureSad("update_manifest_signature", error.reason),
            logForDebugging(
              `${n} is signed but predates manifest-signature enforcement; not eligible as a channel target for this client`,
              { level: "warn" },
            ));
        else if (error.reason === "sidecar_fetch_interrupted")
          (logFeatureSad("update_manifest_signature", error.reason),
            logForDebugging(
              `Signature sidecar fetch for ${n} was interrupted (process suspended mid-request); will retry on the next update check`,
              { level: "warn" },
            ));
        else {
          if ((logFeatureBad("update_manifest_signature", error.reason), isDownload))
            logFeatureBad("update_download", "update_download_manifest_signature");
          logForDebugging(`Manifest signature check failed for ${sidecarUrl}: ${error.reason}`, {
            level: "error",
          });
        }
        throw error;
      }
      (logFeatureSad("update_manifest_signature", error.reason),
        logForDebugging(
          `Manifest signature check failed for ${sidecarUrl}: ${error.reason} (enforcement disabled; continuing)`,
          { level: "warn" },
        ));
    }
  }
  return {
    manifest: manifest,
    manifestAuthenticated: authenticated,
    signatureVerified: signatureVerified,
    metadataDropRetried: dropRetried,
  };
}
/**
 * 从 downloads.claude.ai/claude-code-releases 下载指定版本：读 manifest.zst.json、按平台取二进制并校验 sha256 与签名。
 */
//@ chunk-zw17mz74.js:12952-15273 fingerprint = downloadVersionFromBinaryRepo (0.425)
async function downloadVersionFromBinaryRepo(
  version,
  stagingPath,
  baseUrl,
  { authConfig: authConfig, signaturePolicy: signaturePolicy },
) {
  let fs = getFsImplementation();
  await fs.rm(stagingPath, { recursive: !0, force: !0 });
  let platform = getPlatform(),
    y = getBinaryName(platform),
    startTime = Date.now();
  logEvent("tengu_binary_download_attempt", {});
  let [R, F] = await Promise.all([
      fetchReleaseManifest(baseUrl, version, {
        authConfig: authConfig,
        signaturePolicy: signaturePolicy,
        platform: platform,
        startTime: startTime,
      }),
      fetchWithDropRetry(`${baseUrl}/${version}/manifest.zst.json`, {
        timeout: VERSION_CHECK_TIMEOUT_MS,
        ...authConfig,
        responseType: "json",
        maxContentLength: 1048576,
      }).catch((G) => {
        logForDebugging(`No compressed manifest for ${version}: ${errorMessage(G)}`);
        return;
      }),
    ]),
    { manifest: manifest, signatureVerified: signatureVerified } = R,
    L = F?.data,
    D = R.metadataDropRetried || F?.dropRetried === !0,
    platformInfo = manifest.platforms[platform];
  if (!platformInfo)
    throw (
      logFeatureBad("update_download", "update_download_platform_not_found"),
      logEvent("tengu_binary_platform_not_found", {}),
      new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `Native binaries for ${platform} are not available on this release channel (version ${version} ships: ${Object.keys(manifest.platforms).sort().join(", ")}).`,
        "Native binaries not available for platform on this channel",
      )
    );
  let expectedChecksum = platformInfo.checksum,
    x = L?.platforms?.[platform]?.checksum,
    size = platformInfo.size,
    U =
      x !== void 0 && /^[a-f0-9]{64}$/.test(x) && size !== void 0 && Number.isInteger(size) && size > 0
        ? { checksum: x, decompressedSize: size }
        : void 0,
    binaryUrl = `${baseUrl}/${version}/${platform}/${y}`;
  await fs.mkdir(stagingPath);
  let binaryPath = join_2(stagingPath, y),
    Q = U !== void 0,
    j = Q ? `${binaryUrl}.zst` : binaryUrl;
  try {
    let G;
    if (U)
      try {
        G = await downloadAndVerifyBinary(j, expectedChecksum, binaryPath, authConfig || {}, U);
      } catch (error) {
        if (httpStatusOf(error) === void 0 && !isChecksumFailure(error)) throw error;
        ((Q = !1),
          (j = binaryUrl),
          logForDebugging(
            `Compressed binary unusable (${error instanceof Error ? error.message : String(error)}), falling back to ${binaryUrl}`,
          ));
      }
    let { checksumRetried: checksumRetried, dropRetried: dropRetried } =
        G ?? (await downloadAndVerifyBinary(j, expectedChecksum, binaryPath, authConfig || {})),
      ae = Date.now() - startTime;
    if (U && !Q) logFeatureSad("update_download", "update_download_zst_fallback");
    else if (checksumRetried) logFeatureSad("update_download", "update_download_checksum_retry");
    else if (dropRetried || D) logFeatureSad("update_download", "update_download_drop_retry");
    else logFeatureOk("update_download");
    return (
      logEvent("tengu_binary_download_success", { latency_ms: ae, compressed: Q }),
      { signatureVerified: signatureVerified, expectedChecksum: expectedChecksum }
    );
  } catch (error) {
    let K = Date.now() - startTime,
      ee = error instanceof Error ? error.message : String(error),
      included = ee.includes("Checksum mismatch");
    if (included) logFeatureBad("update_download", "update_download_checksum_mismatch");
    else if (error instanceof StallTimeoutError)
      logFeatureBad("update_download", "update_download_stall_timeout");
    else if (an(error)) logFeatureBad("update_download", "update_download_connection_drop");
    else logFeatureBad("update_download", "update_download_binary_failed");
    throw (
      logEvent("tengu_binary_download_failure", {
        latency_ms: K,
        http_status: httpStatusOf(error),
        is_timeout: isTimeoutError(error),
        is_checksum_mismatch: included,
        attempt: getAttemptNumber(error),
        platform: X4(platform),
        compressed: Q,
      }),
      logForDebugging(`Failed to download binary from ${j}: ${ee}`, { level: "error" }),
      error
    );
  }
}
//@ chunk-zw17mz74.js:15273-15426 layout
function signaturePolicyFor(
  e,
  { explicitVersionRequested: explicitVersionRequested, requireEnforcingRelease: requireEnforcingRelease },
) {
  return requireEnforcingRelease
    ? "require-enforcing-release"
    : explicitVersionRequested && lt_2(e, Te)
      ? "allow-unsigned-legacy"
      : "require";
}
//@ chunk-zw17mz74.js:15426-16020 layout
async function reverifyRetainedVersion(e, n, r) {
  let s = getPlatform(),
    {
      manifest: manifest,
      manifestAuthenticated: manifestAuthenticated,
      signatureVerified: signatureVerified,
    } = await fetchReleaseManifest(Ie, e, {
      signaturePolicy: signaturePolicyFor(e, r),
      platform: s,
      startTime: Date.now(),
      purpose: "reverify",
    });
  if (!manifestAuthenticated)
    return (
      logForDebugging(
        `Manifest for retained ${e} is unauthenticated; activating the retained copy without a checksum comparison`,
        { level: "warn" },
      ),
      { signatureVerified: !1, binaryMatches: !0, expectedChecksum: void 0 }
    );
  let y = manifest.platforms[s]?.checksum,
    S = y !== void 0 && (await fileMatchesChecksum(n, y));
  if (!S) logForDebugging(`Retained ${e} does not match its signed manifest checksum; re-downloading`);
  return { signatureVerified: signatureVerified, binaryMatches: S, expectedChecksum: y };
}
//@ chunk-zw17mz74.js:16020-16132 layout
function isRetryableNetworkError(e) {
  if (!isAxiosError(e) || e.response) return !1;
  let n = extractConnectionErrorDetails(e)?.code;
  return n !== void 0 && (PU.has(n) || n === "ETIMEDOUT");
}
//@ chunk-zw17mz74.js:16132-16213 layout
async function sha256File(e) {
  let n = createHash("sha256");
  return (await pipeline(createReadStream(e), n), n.digest("hex"));
}
//@ chunk-zw17mz74.js:16213-16353 layout
async function fileMatchesChecksum(e, n) {
  try {
    return (await sha256File(e)) === n;
  } catch (error) {
    return (
      logForDebugging(
        `Could not hash ${e} (${getErrnoCode(error) ?? toError(error).name}); treating as mismatched`,
      ),
      !1
    );
  }
}
//@ chunk-zw17mz74.js:16353-16640 callgraph-witnessed = downloadVersion (0.166)
async function downloadVersion(
  e,
  n,
  { explicitVersionRequested: explicitVersionRequested, requireEnforcingRelease: requireEnforcingRelease },
) {
  let { signatureVerified: signatureVerified, expectedChecksum: expectedChecksum } =
    await downloadVersionFromBinaryRepo(e, n, Ie, {
      signaturePolicy: signaturePolicyFor(e, {
        explicitVersionRequested: explicitVersionRequested,
        requireEnforcingRelease: requireEnforcingRelease,
      }),
    });
  return { downloadType: "binary", signatureVerified: signatureVerified, expectedChecksum: expectedChecksum };
}
//@ chunk-zw17mz74.js:16640-16708 layout
function httpStatusOf(e) {
  if (isAxiosError(e) && e.response) return e.response.status;
  return;
}
//@ chunk-zw17mz74.js:16708-17028 layout
function isTimeoutError(e) {
  if (e instanceof StallTimeoutError) return !0;
  if (isCancel(e)) return !0;
  if (isAxiosError(e) && (e.code === "ECONNABORTED" || e.code === "ETIMEDOUT")) return !0;
  if (e !== null && typeof e === "object" && "code" in e && e.code === "ETIMEDOUT") return !0;
  let lower = (e instanceof Error ? e.message : String(e)).toLowerCase();
  return lower.includes("timeout") || lower.includes("timed out");
}
//@ chunk-zw17mz74.js:17028-17087 placement
function tn(e) {
  return getErrnoCode(e)?.startsWith("ZSTD_error_") === !0;
}
//@ chunk-zw17mz74.js:17087-17227 placement
function isChecksumFailure(e) {
  let n = e instanceof Error ? e.message : String(e);
  return n.includes("Checksum mismatch") || n.includes("exceeds the manifest size");
}
//@ chunk-zw17mz74.js:17227-17322 placement
function rn(e) {
  return e !== null && typeof e === "object" && "deterministic" in e && e.deterministic === !0;
}
//@ chunk-zw17mz74.js:17322-17419 placement
function an(e) {
  return e !== null && typeof e === "object" && "connectionDrop" in e && e.connectionDrop === !0;
}
//@ chunk-zw17mz74.js:17419-17535 placement
function getAttemptNumber(e) {
  if (e !== null && typeof e === "object" && "attempt" in e && typeof e.attempt === "number")
    return e.attempt;
  return;
}
//@ chunk-zw17mz74.js:17535-17587 placement
function sn() {
  try {
    return getPlatform();
  } catch {
    return "unknown";
  }
}
//@ chunk-zw17mz74.js:17587-17813 placement
async function fetchWithDropRetry(e, n) {
  let r = !1;
  for (let s = 1; ; s++)
    try {
      return { data: (await httpGet(e, n)).data, dropRetried: r };
    } catch (error) {
      if (s >= MAX_DOWNLOAD_RETRIES || !isRetriableConnectionDrop(error)) throw error;
      ((r = !0),
        logForDebugging(
          `Fetch of ${e} connection dropped on attempt ${s}/${MAX_DOWNLOAD_RETRIES}, retrying...`,
        ),
        await sleep(RETRY_BASE_DELAY_MS));
    }
}
//@ chunk-zw17mz74.js:17908-17940 placement
function me() {
  return !isEnvDefinedFalsy(void 0);
}

export {
  me,
  sha256File,
  reverifyRetainedVersion,
  ManifestSignatureError,
  isRetryableNetworkError,
  fileMatchesChecksum,
  downloadVersion,
  getLatestVersion,
  StallTimeoutError,
  ZNo,
};
