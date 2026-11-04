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
import { createPublicKey, createHash, verify } from "crypto";
import { Transform, Readable } from "stream";
import { createWriteStream, createReadStream } from "fs";
import { pipeline } from "stream/promises";
import { createZstdDecompress } from "zlib";
import { chmod, rm } from "fs/promises";
import { join } from "path";
import { DoctorLazy } from "../../cli/handlers/util.js";
import {
  objectSchema,
  literal,
  stringSchema,
  looseObject,
  record,
  numberSchema,
} from "../../../vendor/zod/v4/classic/schemas.js";
import {
  TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
  hasExactErrorMessage,
  getErrnoCode,
  toError,
  errorMessage,
} from "../errors.js";
import { jsonParse } from "../slowOperations.js";
import { isAnthropicOwnedHost } from "../anthropicHosts.js";
import { publicCdnGuardedClient } from "./downloadsClient.js";
import { externalHttp } from "../../services/http/externalHttp.js";
import { retryWithTimeout } from "../autoUpdater.js";
import { logForDebugging } from "../debug.js";
import { logFeatureBad, logFeatureSad, logFeatureOk } from "../../services/analytics/featureTelemetry.js";
import { logEvent } from "../../services/analytics/index.js";
import { platformOrOther } from "../../services/analytics/metadata.js";
import { fromEnum } from "../../services/analytics/safeMetadata.js";
import { isSemverVersion } from "../model/modelCatalog/catalogCapabilities.js";
import { env } from "../env.js";
import { isAxiosError, isCancel } from "../../../vendor/axios/dist/esm/axios.js";
import {
  extractConnectionErrorDetails,
  TRANSIENT_SOCKET_CODES,
  UNREACHABLE_ERROR_CODES,
} from "../../services/api/errorUtils.js";
import { sleep } from "../sleep.js";
import {
  getFeatureValue_CACHED_MAY_BE_STALE,
  initializeGrowthBook,
} from "../../services/analytics/growthbook.js";
import { getBinaryName, getPlatform } from "./installer.js";
import { getFsImplementation } from "../fsOperations.js";
import { lt_2 } from "../semver.js";
import { isEnvDefinedFalsy } from "../envUtils.js";
import { deferInit } from "../../../runtime/deferred-init.js";

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
var buffer; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var FLAG_ENFORCEMENT;
var FLAG;
deferInit("chunk-zw17mz74.js:3305", () => {
  buffer = Buffer.from("claude-code-manifest-v1\x00");
  FLAG_ENFORCEMENT = "2.1.207";
  FLAG = "flag";
});
//@ chunk-zw17mz74.js:3378-3677 placement
var MANIFEST_SIGNATURE_VERSION; // deferred: uses DoctorLazy (../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
var RSASSA_PKCS1_V1_5_SHA512;
var manifestSignatureSchema;
var releaseManifestSchema;
deferInit("chunk-zw17mz74.js:3378", () => {
  MANIFEST_SIGNATURE_VERSION = 1;
  RSASSA_PKCS1_V1_5_SHA512 = "RSASSA-PKCS1-v1_5-SHA512";
  manifestSignatureSchema = DoctorLazy(() =>
    objectSchema({
      schema: literal(MANIFEST_SIGNATURE_VERSION),
      algorithm: literal(RSASSA_PKCS1_V1_5_SHA512),
      signature: stringSchema().min(1),
      publicKeySha256: stringSchema().regex(/^[0-9a-f]{64}$/),
    }),
  );
  releaseManifestSchema = DoctorLazy(() =>
    looseObject({
      version: stringSchema(),
      manifestSignatureEnforcement: stringSchema().optional(),
      platforms: record(
        stringSchema(),
        looseObject({
          checksum: stringSchema(),
          size: numberSchema().optional(),
          binary: stringSchema().optional(),
        }),
      ),
    }),
  );
});
//@ chunk-zw17mz74.js:3677-3917 placement
let ManifestSignatureError; // deferred: uses TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS (../errors.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-zw17mz74.js:3677", () => {
  ManifestSignatureError = class ManifestSignatureError extends (
    TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS
  ) {
    reason;
    constructor(version, reason) {
      super(
        `Release verification failed for Claude Code ${version} (${reason}). The update was not installed.`,
        "Release manifest signature verification failed",
        reason,
      );
      this.name = "ManifestSignatureError";
      this.reason = reason;
    }
  };
});
//@ chunk-zw17mz74.js:3917-4656 placement
/**
 * 校验发布清单的签名附件（格式、密钥不符、签名无效、版本不符）。
 */
function verifyManifestSidecar({ manifestBytes, sidecar, expectedVersion, publicKeyPem }) {
  let parsed = manifestSignatureSchema().safeParse(sidecar);
  if (!parsed.success) throw new ManifestSignatureError(expectedVersion, "sidecar_malformed");
  let { signature, publicKeySha256 } = parsed.data;
  if (Buffer.from(signature, "base64").toString("base64") !== signature)
    throw new ManifestSignatureError(expectedVersion, "sidecar_malformed");
  let publicKey;
  try {
    publicKey = createPublicKey(publicKeyPem);
  } catch {
    throw new ManifestSignatureError(expectedVersion, "key_mismatch");
  }
  let keyFingerprint = createHash("sha256")
    .update(
      publicKey.export({
        type: "spki",
        format: "der",
      }),
    )
    .digest("hex");
  if (publicKeySha256 !== keyFingerprint) throw new ManifestSignatureError(expectedVersion, "key_mismatch");
  let verified = false;
  try {
    verified = verify(
      "sha512",
      Buffer.concat([buffer, manifestBytes]),
      publicKey,
      Buffer.from(signature, "base64"),
    );
  } catch {
    verified = false;
  }
  if (!verified) throw new ManifestSignatureError(expectedVersion, "signature_invalid");
  let manifest;
  try {
    let manifestResult = releaseManifestSchema().safeParse(jsonParse(manifestBytes.toString("utf8")));
    manifest = manifestResult.success ? manifestResult.data : undefined;
  } catch {
    manifest = undefined;
  }
  if (!manifest || manifest.version !== expectedVersion)
    throw new ManifestSignatureError(expectedVersion, "version_mismatch");
  return manifest;
}
//@ chunk-zw17mz74.js:4656-4728 placement
var DOWNLOAD_BASE_URL = "https://downloads.claude.ai/claude-code-releases";
var VERSION_CHECK_TIMEOUT_MS = 30000;
var VERSION_CHECK_ATTEMPTS = 3;
//@ chunk-zw17mz74.js:4728-4749 placement
/**
 * 版本清单错误（可安全上报遥测的文案）。
 */
let ReleaseManifestError; // deferred: uses TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS (../errors.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-zw17mz74.js:4728", () => {
  ReleaseManifestError = class ReleaseManifestError extends (
    TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS
  ) {};
});
//@ chunk-zw17mz74.js:4749-4803 layout
function httpGet(url, options) {
  return isAnthropicOwnedHost(url)
    ? publicCdnGuardedClient.get(url, options)
    : externalHttp.get(url, options);
}
//@ chunk-zw17mz74.js:4803-5961 fingerprint (2.1.88 match: getLatestVersionFromBinaryRepo, 0.413)
/**
 * 从二进制仓库读 stable/latest 通道的版本号（带重试）。
 */
async function getLatestVersionFromBinaryRepo(channel = "latest", baseUrl, authConfig) {
  let startTime = Date.now();
  let attempts = 0;
  let response;
  try {
    response = await retryWithTimeout(
      (signal) => {
        attempts++;
        return httpGet(`${baseUrl}/${channel}`, {
          timeout: VERSION_CHECK_TIMEOUT_MS,
          responseType: "text",
          signal,
          ...authConfig,
        });
      },
      {
        attempts: VERSION_CHECK_ATTEMPTS,
        timeoutMs: VERSION_CHECK_TIMEOUT_MS,
        onRetry: (attempt, error) => {
          logForDebugging(
            `Version check failed on attempt ${attempt}/${VERSION_CHECK_ATTEMPTS}, retrying: ${error instanceof Error ? error.message : String(error)}`,
          );
        },
      },
    );
  } catch (error) {
    let latencyMs = Date.now() - startTime;
    let errorMessage = error instanceof Error ? error.message : String(error);
    let httpStatus = httpStatusOf(error);
    logFeatureBad("update_check", "update_check_binary_repo_failed");
    logEvent("tengu_version_check_failure", {
      latency_ms: latencyMs,
      http_status: httpStatus,
      is_timeout: isTimeoutError(error),
      attempt: attempts,
      platform: platformOrOther(safePlatform()),
      channel: fromEnum(channel),
    });
    let wrappedError = new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `Failed to fetch version from ${baseUrl}/${channel} after ${attempts} attempt(s): ${errorMessage}`,
      "Failed to fetch version from binary repo",
    );
    logForDebugging(
      `Failed to fetch version from ${baseUrl}/${channel} after ${attempts} attempt(s): ${errorMessage}`,
      {
        level: "error",
      },
    );
    throw wrappedError;
  }
  let latencyMs = Date.now() - startTime;
  let trimmed = response.data.trim();
  let bodyLength = trimmed.length;
  if (!isSemverVersion(trimmed)) {
    logFeatureBad("update_check", "update_check_binary_repo_invalid_response");
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `Version pointer for ${channel} did not return a version (got ${bodyLength} bytes)`,
      "Version pointer returned a non-version body",
    );
  }
  logEvent("tengu_version_check_success", {
    latency_ms: latencyMs,
    attempt: attempts,
  });
  if (attempts > 1) logFeatureSad("update_check", "update_check_binary_repo_retry");
  else logFeatureOk("update_check");
  return trimmed;
}
//@ chunk-zw17mz74.js:5961-6486 fingerprint (2.1.88 match: getLatestVersion, 0.716)
/**
 * 把 stable/latest/具体版本解析为要安装的版本号（拒绝 99.99.* 测试版本）。
 */
async function getLatestVersion(channelOrVersion) {
  if (/^v?\d+\.\d+\.\d+(-\S+)?$/.test(channelOrVersion)) {
    let normalized = channelOrVersion.startsWith("v") ? channelOrVersion.slice(1) : channelOrVersion;
    if (/^99\.99\./.test(normalized))
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `Version ${normalized} is not available for installation. Use 'stable' or 'latest'.`,
        "Test-fixture version rejected outside test builds",
      );
    return normalized;
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
  return getLatestVersionFromBinaryRepo(channel, DOWNLOAD_BASE_URL);
}
//@ chunk-zw17mz74.js:6486-6566 layout
var npmManifestSchema; // deferred: uses DoctorLazy (../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-zw17mz74.js:6486", () => {
  npmManifestSchema = DoctorLazy(() =>
    objectSchema({
      dist: objectSchema({
        integrity: stringSchema().min(1),
        tarball: stringSchema().min(1).optional(),
      }),
    }),
  );
});
//@ chunk-zw17mz74.js:6566-6632 layout
var DEFAULT_STALL_TIMEOUT_MS = 120000;
var MAX_DOWNLOAD_RETRIES = 3;
var DOWNLOAD_DEADLINE_MS = 600000;
var VERSION_CHECK_TIMEOUT_MS_2 = 1e4;
var RETRY_BASE_DELAY_MS = 1000;
var VERSION_CHECK_BUDGET_MS = MAX_DOWNLOAD_RETRIES * (VERSION_CHECK_TIMEOUT_MS_2 + RETRY_BASE_DELAY_MS);
var VERSION_CHECK_TOTAL_MS = 2 * VERSION_CHECK_BUDGET_MS;
//@ chunk-zw17mz74.js:6632-6708 fingerprint (2.1.88 match: getStallTimeoutMs, 1)
function getStallTimeoutMs() {
  return Number(env.CLAUDE_CODE_STALL_TIMEOUT_MS_FOR_TESTING) || DEFAULT_STALL_TIMEOUT_MS;
}
//@ chunk-zw17mz74.js:6708-6788 layout
function getDownloadDeadlineMs() {
  return Number(env.CLAUDE_CODE_DOWNLOAD_DEADLINE_MS_FOR_TESTING) || DOWNLOAD_DEADLINE_MS;
}
//@ chunk-zw17mz74.js:6788-6917 fingerprint (2.1.88 match: StallTimeoutError, 0.667)
/**
 * 下载 120 秒无数据时抛出的错误。
 */
class StallTimeoutError extends Error {
  constructor() {
    super("Download stalled: no data received for 120 seconds");
    this.name = "StallTimeoutError";
  }
}
//@ chunk-zw17mz74.js:6917-7098 layout
function isRetriableConnectionDrop(error) {
  if (isAxiosError(error) && error.response) return false;
  let code = extractConnectionErrorDetails(error)?.code;
  if (code === "ECONNABORTED" || code === "ETIMEDOUT") return false;
  if (code !== undefined && (TRANSIENT_SOCKET_CODES.has(code) || UNREACHABLE_ERROR_CODES.has(code)))
    return true;
  return hasExactErrorMessage(error, "aborted");
}
//@ chunk-zw17mz74.js:7098-9731 layout
/**
 * 下载更新二进制（可选 zstd 解压并限制解压后大小）：边下载边算 SHA-256，带停滞超时与总截止时间；校验和不符、停滞或连接中断时有限次重试，失败时删除半成品，成功后设为可执行。
 */
async function downloadAndVerifyBinary(url, expectedChecksum, destPath, requestOptions = {}, compressed) {
  let lastError;
  let checksumRetried = false;
  let dropRetried = false;
  for (let attempt = 1; attempt <= MAX_DOWNLOAD_RETRIES; attempt++) {
    let abortController = new AbortController();
    let streamFinished = false;
    let completed = false;
    let stallTimer;
    let deadlineTimer;
    let fileStream;
    let clearTimers = () => {
      if (stallTimer) {
        clearTimeout(stallTimer);
        stallTimer = undefined;
      }
      if (deadlineTimer) {
        clearTimeout(deadlineTimer);
        deadlineTimer = undefined;
      }
    };
    let resetStallTimer = () => {
      if (stallTimer) stallTimer.refresh();
      else
        stallTimer = setTimeout(
          (controller) => controller.abort("stall"),
          getStallTimeoutMs(),
          abortController,
        );
    };
    try {
      resetStallTimer();
      deadlineTimer = setTimeout(
        (controller) => controller.abort("deadline"),
        getDownloadDeadlineMs(),
        abortController,
      );
      let response = await httpGet(url, {
        timeout: DOWNLOAD_DEADLINE_MS,
        responseType: "stream",
        signal: abortController.signal,
        ...requestOptions,
      });
      let hash = createHash("sha256");
      let compressedHash = compressed ? createHash("sha256") : undefined;
      let activeHash = compressedHash ?? hash;
      let hashingTransform = new Transform({
        transform(chunk, encoding, callback) {
          resetStallTimer();
          activeHash.update(chunk);
          callback(null, chunk);
        },
      });
      fileStream = createWriteStream(destPath, {
        highWaterMark: 4194304,
      });
      fileStream.on("drain", resetStallTimer);
      if (compressed) {
        let decompressedBytes = 0;
        let sizeGuard = new Transform({
          transform(chunk, encoding, callback) {
            decompressedBytes += chunk.length;
            if (decompressedBytes > compressed.decompressedSize) {
              callback(
                new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
                  `Decompressed binary exceeds the manifest size of ${compressed.decompressedSize} bytes`,
                  "Decompressed binary larger than manifest size",
                ),
              );
              return;
            }
            hash.update(chunk);
            callback(null, chunk);
          },
        });
        await pipeline(response.data, hashingTransform, createZstdDecompress(), sizeGuard, fileStream, {
          signal: abortController.signal,
        });
      } else
        await pipeline(response.data, hashingTransform, fileStream, {
          signal: abortController.signal,
        });
      streamFinished = true;
      clearTimers();
      if (compressed) {
        let compressedDigest = compressedHash?.digest("hex");
        if (compressedDigest !== compressed.checksum)
          throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
            `Checksum mismatch: expected ${compressed.checksum}, got ${compressedDigest} (compressed)`,
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
          {
            deterministic: compressed !== undefined,
          },
        );
      completed = true;
      await chmod(destPath, 493);
      return {
        checksumRetried,
        dropRetried,
      };
    } catch (error) {
      clearTimers();
      let normalizedError = isZstdError(error)
        ? Object.assign(
            new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
              `Checksum mismatch: zstd decoder rejected the frame (${getErrnoCode(error)})`,
              "zstd decoder rejected the frame",
            ),
            {
              cause: error,
            },
          )
        : error;
      if (isAxiosError(normalizedError) && normalizedError.response?.data instanceof Readable)
        normalizedError.response.data.destroy();
      if (fileStream && !completed) {
        let stream = fileStream;
        await new Promise((resolve) => stream.close(() => resolve()));
        await rm(destPath, {
          force: true,
        }).catch((error) =>
          logForDebugging(
            `Failed to remove partial download: ${error instanceof Error ? error.message : String(error)}`,
            {
              level: "error",
            },
          ),
        );
      }
      let abortReason = abortController.signal.aborted ? abortController.signal.reason : undefined;
      let isDeadline = abortReason === "deadline";
      let isStall = !isDeadline && (abortReason === "stall" || isCancel(normalizedError));
      if (isDeadline)
        throw Object.assign(
          new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
            "Download timed out: exceeded the total deadline",
          ),
          {
            attempt,
          },
        );
      let isChecksumMismatch =
        normalizedError instanceof Error && normalizedError.message.includes("Checksum mismatch");
      let isConnectionDrop =
        !streamFinished &&
        (isRetriableConnectionDrop(normalizedError) ||
          extractConnectionErrorDetails(normalizedError)?.code === "ERR_STREAM_PREMATURE_CLOSE");
      let failure = isStall ? new StallTimeoutError() : toError(normalizedError);
      lastError = failure;
      if (
        (isStall || isChecksumMismatch || isConnectionDrop) &&
        !isDeterministicError(normalizedError) &&
        attempt < MAX_DOWNLOAD_RETRIES
      ) {
        if (isChecksumMismatch) checksumRetried = true;
        else if (isConnectionDrop) dropRetried = true;
        logForDebugging(
          `Download ${isChecksumMismatch ? "checksum mismatch" : isStall ? "stalled" : "connection dropped"} on attempt ${attempt}/${MAX_DOWNLOAD_RETRIES}, retrying...`,
        );
        await sleep(1000);
        continue;
      }
      if (isConnectionDrop) {
        let errnoCode = getErrnoCode(failure);
        throw Object.assign(
          new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
            `The connection dropped while downloading the update (attempt ${attempt}/${MAX_DOWNLOAD_RETRIES}: ${failure.message}). Check your network \u2014 proxies sometimes cut off large downloads.`,
            "Connection dropped repeatedly during binary download",
          ),
          {
            attempt,
            connectionDrop: true,
            cause: failure,
            ...(errnoCode && {
              code: errnoCode,
            }),
          },
        );
      }
      throw Object.assign(failure, {
        attempt,
      });
    }
  }
  throw lastError ?? Error("Download failed after all retries");
}
//@ chunk-zw17mz74.js:9731-9784 layout
function signatureEnforcementFlag() {
  return getFeatureValue_CACHED_MAY_BE_STALE("tengu_elegant_pancake", null);
}
//@ chunk-zw17mz74.js:9784-9840 layout (2.1.88 match: formatRelativeTimeAgo, 0.75)
function formatRelativeTimeAgo(date, options = signatureEnforcementFlag()) {
  return date === "always" ? options !== false : options === true;
}
//@ chunk-zw17mz74.js:9840-9864 layout
function flagEnforcementMode() {
  return FLAG;
}
//@ chunk-zw17mz74.js:9864-9894 layout
function enforcementFlagTime() {
  return formatRelativeTimeAgo(flagEnforcementMode());
}
//@ chunk-zw17mz74.js:9894-9957 layout
function isSignatureEnforced(manifestSignatureEnforcement, options) {
  return (
    manifestSignatureEnforcement === "always" ||
    (manifestSignatureEnforcement === "flag" && formatRelativeTimeAgo("flag", options))
  );
}
//@ chunk-zw17mz74.js:9957-12952 layout
/**
 * 获取版本的 manifest.json 并按策略校验签名旁文件（RSASSA-PKCS1-v1_5-SHA512）：缺签名时可按旧版放行，核对二进制名与强制签名的发布时间；失败按是否强制决定抛错或告警继续，返回 manifest 与认证状态。
 */
async function fetchReleaseManifest(
  baseUrl,
  version,
  { authConfig, signaturePolicy, platform, startTime, purpose = "download" },
) {
  let isDownload = purpose === "download";
  let manifestBytes;
  let manifest;
  let dropRetried = false;
  let binaryName = getBinaryName(platform);
  try {
    let manifestResponse = await fetchWithDropRetry(`${baseUrl}/${version}/manifest.json`, {
      timeout: VERSION_CHECK_TIMEOUT_MS_2,
      ...authConfig,
      responseType: "arraybuffer",
      maxContentLength: 1048576,
    });
    dropRetried = manifestResponse.dropRetried;
    manifestBytes = Buffer.from(manifestResponse.data);
    let parsed = releaseManifestSchema().safeParse(jsonParse(manifestBytes.toString("utf8")));
    if (!parsed.success)
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `Manifest for ${version} is not a valid release manifest`,
        "Release manifest failed schema validation",
      );
    manifest = parsed.data;
  } catch (error) {
    let latencyMs = Date.now() - startTime;
    let message = error instanceof Error ? error.message : String(error);
    if (isDownload) logFeatureBad("update_download", "update_download_manifest_failed");
    logEvent("tengu_binary_manifest_fetch_failure", {
      latency_ms: latencyMs,
      http_status: httpStatusOf(error),
      is_timeout: isTimeoutError(error),
      platform: platformOrOther(platform),
    });
    logForDebugging(`Failed to fetch manifest from ${baseUrl}/${version}/manifest.json: ${message}`, {
      level: "error",
    });
    throw error;
  }
  let authenticated = false;
  let signatureVerified = false;
  if (signaturePolicy !== "skip") {
    let sidecarUrl = `${baseUrl}/${version}/manifest.json.raw-sig.json`;
    let now = Date.now();
    let sidecarStatus;
    let enforcement;
    try {
      let sidecar;
      let isUnsigned = false;
      try {
        let sidecarResponse = await fetchWithDropRetry(sidecarUrl, {
          timeout: VERSION_CHECK_TIMEOUT_MS_2,
          ...authConfig,
          responseType: "json",
          maxContentLength: 65536,
          signal: AbortSignal.timeout(VERSION_CHECK_BUDGET_MS),
        });
        dropRetried ||= sidecarResponse.dropRetried;
        sidecar = sidecarResponse.data;
      } catch (error) {
        sidecarStatus = httpStatusOf(error);
        if (sidecarStatus !== 404)
          throw new ManifestSignatureError(
            version,
            sidecarStatus !== undefined
              ? "sidecar_fetch_http_error"
              : Date.now() - now > VERSION_CHECK_TOTAL_MS
                ? "sidecar_fetch_interrupted"
                : isTimeoutError(error)
                  ? "sidecar_fetch_timeout"
                  : "sidecar_fetch_connection_error",
          );
        if (signaturePolicy !== "allow-unsigned-legacy")
          throw new ManifestSignatureError(version, "sidecar_missing");
        isUnsigned = true;
      }
      if (isUnsigned) {
        logFeatureSad("update_manifest_signature", "unsigned_legacy");
        logForDebugging(
          `No manifest signature published for ${version} (predates ${FLAG_ENFORCEMENT}); continuing with checksum-only verification`,
          {
            level: "warn",
          },
        );
      } else {
        let signedManifest = verifyManifestSidecar({
          manifestBytes,
          sidecar,
          expectedVersion: version,
          publicKeyPem: verifyReleaseManifest(),
        });
        logForDebugging(`Verified manifest signature for ${version}`);
        let platformEntry = signedManifest.platforms[platform];
        if (platformEntry && platformEntry.binary !== binaryName)
          throw new ManifestSignatureError(version, "binary_name_mismatch");
        manifest = signedManifest;
        authenticated = true;
        if (signaturePolicy === "require-enforcing-release") {
          await initializeGrowthBook().catch(() => null);
          enforcement = {
            flag: signatureEnforcementFlag(),
          };
          if (!isSignatureEnforced(signedManifest.manifestSignatureEnforcement, enforcement.flag))
            throw new ManifestSignatureError(version, "release_predates_enforcement");
        }
        signatureVerified = true;
        logFeatureOk("update_manifest_signature");
      }
    } catch (error) {
      if (!(error instanceof ManifestSignatureError)) throw error;
      let latencyMs = Date.now() - now;
      await initializeGrowthBook().catch(() => null);
      let enforcedMode = enforcement
        ? formatRelativeTimeAgo(flagEnforcementMode(), enforcement.flag)
        : enforcementFlagTime();
      logEvent("tengu_binary_manifest_signature_failed", {
        reason: fromEnum(error.reason),
        http_status: sidecarStatus,
        enforced: enforcedMode,
        platform: platformOrOther(platform),
        latency_ms: latencyMs,
      });
      if (enforcedMode) {
        if (error.reason === "release_predates_enforcement") {
          logFeatureSad("update_manifest_signature", error.reason);
          logForDebugging(
            `${version} is signed but predates manifest-signature enforcement; not eligible as a channel target for this client`,
            {
              level: "warn",
            },
          );
        } else if (error.reason === "sidecar_fetch_interrupted") {
          logFeatureSad("update_manifest_signature", error.reason);
          logForDebugging(
            `Signature sidecar fetch for ${version} was interrupted (process suspended mid-request); will retry on the next update check`,
            {
              level: "warn",
            },
          );
        } else {
          logFeatureBad("update_manifest_signature", error.reason);
          if (isDownload) logFeatureBad("update_download", "update_download_manifest_signature");
          logForDebugging(`Manifest signature check failed for ${sidecarUrl}: ${error.reason}`, {
            level: "error",
          });
        }
        throw error;
      }
      logFeatureSad("update_manifest_signature", error.reason);
      logForDebugging(
        `Manifest signature check failed for ${sidecarUrl}: ${error.reason} (enforcement disabled; continuing)`,
        {
          level: "warn",
        },
      );
    }
  }
  return {
    manifest,
    manifestAuthenticated: authenticated,
    signatureVerified,
    metadataDropRetried: dropRetried,
  };
}
//@ chunk-zw17mz74.js:12952-15273 fingerprint (2.1.88 match: downloadVersionFromBinaryRepo, 0.425)
/**
 * 从 downloads.claude.ai/claude-code-releases 下载指定版本：读 manifest.zst.json、按平台取二进制并校验 sha256 与签名。
 */
async function downloadVersionFromBinaryRepo(version, stagingPath, baseUrl, { authConfig, signaturePolicy }) {
  let fs = getFsImplementation();
  await fs.rm(stagingPath, {
    recursive: true,
    force: true,
  });
  let platform = getPlatform();
  let binaryName = getBinaryName(platform);
  let startTime = Date.now();
  logEvent("tengu_binary_download_attempt", {});
  let [releaseManifest, compressedManifestResponse] = await Promise.all([
    fetchReleaseManifest(baseUrl, version, {
      authConfig,
      signaturePolicy,
      platform,
      startTime,
    }),
    fetchWithDropRetry(`${baseUrl}/${version}/manifest.zst.json`, {
      timeout: VERSION_CHECK_TIMEOUT_MS_2,
      ...authConfig,
      responseType: "json",
      maxContentLength: 1048576,
    }).catch((error) => {
      logForDebugging(`No compressed manifest for ${version}: ${errorMessage(error)}`);
      return;
    }),
  ]);
  let { manifest, signatureVerified } = releaseManifest;
  let compressedManifest = compressedManifestResponse?.data;
  let metadataDropRetried =
    releaseManifest.metadataDropRetried || compressedManifestResponse?.dropRetried === true;
  let platformInfo = manifest.platforms[platform];
  if (!platformInfo) {
    logFeatureBad("update_download", "update_download_platform_not_found");
    logEvent("tengu_binary_platform_not_found", {});
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `Native binaries for ${platform} are not available on this release channel (version ${version} ships: ${Object.keys(manifest.platforms).sort().join(", ")}).`,
      "Native binaries not available for platform on this channel",
    );
  }
  let expectedChecksum = platformInfo.checksum;
  let checksum = compressedManifest?.platforms?.[platform]?.checksum;
  let size = platformInfo.size;
  let compressed =
    checksum !== undefined &&
    /^[a-f0-9]{64}$/.test(checksum) &&
    size !== undefined &&
    Number.isInteger(size) &&
    size > 0
      ? {
          checksum,
          decompressedSize: size,
        }
      : undefined;
  let binaryUrl = `${baseUrl}/${version}/${platform}/${binaryName}`;
  await fs.mkdir(stagingPath);
  let binaryPath = join(stagingPath, binaryName);
  let useCompressed = compressed !== undefined;
  let url = useCompressed ? `${binaryUrl}.zst` : binaryUrl;
  try {
    let downloadResult;
    if (compressed)
      try {
        downloadResult = await downloadAndVerifyBinary(
          url,
          expectedChecksum,
          binaryPath,
          authConfig || {},
          compressed,
        );
      } catch (error) {
        if (httpStatusOf(error) === undefined && !isChecksumFailure(error)) throw error;
        useCompressed = false;
        url = binaryUrl;
        logForDebugging(
          `Compressed binary unusable (${error instanceof Error ? error.message : String(error)}), falling back to ${binaryUrl}`,
        );
      }
    let { checksumRetried, dropRetried } =
      downloadResult ?? (await downloadAndVerifyBinary(url, expectedChecksum, binaryPath, authConfig || {}));
    let latencyMs = Date.now() - startTime;
    if (compressed && !useCompressed) logFeatureSad("update_download", "update_download_zst_fallback");
    else if (checksumRetried) logFeatureSad("update_download", "update_download_checksum_retry");
    else if (dropRetried || metadataDropRetried)
      logFeatureSad("update_download", "update_download_drop_retry");
    else logFeatureOk("update_download");
    logEvent("tengu_binary_download_success", {
      latency_ms: latencyMs,
      compressed: useCompressed,
    });
    return {
      signatureVerified,
      expectedChecksum,
    };
  } catch (error) {
    let latencyMs = Date.now() - startTime;
    let downloadType = error instanceof Error ? error.message : String(error);
    let included = downloadType.includes("Checksum mismatch");
    if (included) logFeatureBad("update_download", "update_download_checksum_mismatch");
    else if (error instanceof StallTimeoutError)
      logFeatureBad("update_download", "update_download_stall_timeout");
    else if (isConnectionDropError(error))
      logFeatureBad("update_download", "update_download_connection_drop");
    else logFeatureBad("update_download", "update_download_binary_failed");
    logEvent("tengu_binary_download_failure", {
      latency_ms: latencyMs,
      http_status: httpStatusOf(error),
      is_timeout: isTimeoutError(error),
      is_checksum_mismatch: included,
      attempt: getAttemptNumber(error),
      platform: platformOrOther(platform),
      compressed: useCompressed,
    });
    logForDebugging(`Failed to download binary from ${url}: ${downloadType}`, {
      level: "error",
    });
    throw error;
  }
}
//@ chunk-zw17mz74.js:15273-15426 layout
function signaturePolicyFor(version, { explicitVersionRequested, requireEnforcingRelease }) {
  return requireEnforcingRelease
    ? "require-enforcing-release"
    : explicitVersionRequested && lt_2(version, FLAG_ENFORCEMENT)
      ? "allow-unsigned-legacy"
      : "require";
}
//@ chunk-zw17mz74.js:15426-16020 layout
async function reverifyRetainedVersion(version, filePath, options) {
  let platform = getPlatform();
  let { manifest, manifestAuthenticated, signatureVerified } = await fetchReleaseManifest(
    DOWNLOAD_BASE_URL,
    version,
    {
      signaturePolicy: signaturePolicyFor(version, options),
      platform,
      startTime: Date.now(),
      purpose: "reverify",
    },
  );
  if (!manifestAuthenticated) {
    logForDebugging(
      `Manifest for retained ${version} is unauthenticated; activating the retained copy without a checksum comparison`,
      {
        level: "warn",
      },
    );
    return {
      signatureVerified: false,
      binaryMatches: true,
      expectedChecksum: undefined,
    };
  }
  let checksum = manifest.platforms[platform]?.checksum;
  let checksumMatches = checksum !== undefined && (await fileMatchesChecksum(filePath, checksum));
  if (!checksumMatches)
    logForDebugging(`Retained ${version} does not match its signed manifest checksum; re-downloading`);
  return {
    signatureVerified,
    binaryMatches: checksumMatches,
    expectedChecksum: checksum,
  };
}
//@ chunk-zw17mz74.js:16020-16132 layout
function isRetryableNetworkError(error) {
  if (!isAxiosError(error) || error.response) return false;
  let code = extractConnectionErrorDetails(error)?.code;
  return code !== undefined && (UNREACHABLE_ERROR_CODES.has(code) || code === "ETIMEDOUT");
}
//@ chunk-zw17mz74.js:16132-16213 layout
async function sha256File(filePath) {
  let hash = createHash("sha256");
  await pipeline(createReadStream(filePath), hash);
  return hash.digest("hex");
}
//@ chunk-zw17mz74.js:16213-16353 layout
async function fileMatchesChecksum(filePath, expectedHash) {
  try {
    return (await sha256File(filePath)) === expectedHash;
  } catch (error) {
    logForDebugging(
      `Could not hash ${filePath} (${getErrnoCode(error) ?? toError(error).name}); treating as mismatched`,
    );
    return false;
  }
}
//@ chunk-zw17mz74.js:16353-16640 callgraph-witnessed (2.1.88 match: downloadVersion, 0.166)
async function downloadVersion(version, stagingPath, { explicitVersionRequested, requireEnforcingRelease }) {
  let { signatureVerified, expectedChecksum } = await downloadVersionFromBinaryRepo(
    version,
    stagingPath,
    DOWNLOAD_BASE_URL,
    {
      signaturePolicy: signaturePolicyFor(version, {
        explicitVersionRequested,
        requireEnforcingRelease,
      }),
    },
  );
  return {
    downloadType: "binary",
    signatureVerified,
    expectedChecksum,
  };
}
//@ chunk-zw17mz74.js:16640-16708 layout
function httpStatusOf(error) {
  if (isAxiosError(error) && error.response) return error.response.status;
  return;
}
//@ chunk-zw17mz74.js:16708-17028 layout
function isTimeoutError(error) {
  if (error instanceof StallTimeoutError) return true;
  if (isCancel(error)) return true;
  if (isAxiosError(error) && (error.code === "ECONNABORTED" || error.code === "ETIMEDOUT")) return true;
  if (error !== null && typeof error === "object" && "code" in error && error.code === "ETIMEDOUT")
    return true;
  let lower = (error instanceof Error ? error.message : String(error)).toLowerCase();
  return lower.includes("timeout") || lower.includes("timed out");
}
//@ chunk-zw17mz74.js:17028-17087 placement
function isZstdError(error) {
  return getErrnoCode(error)?.startsWith("ZSTD_error_") === true;
}
//@ chunk-zw17mz74.js:17087-17227 placement
function isChecksumFailure(error) {
  let message = error instanceof Error ? error.message : String(error);
  return message.includes("Checksum mismatch") || message.includes("exceeds the manifest size");
}
//@ chunk-zw17mz74.js:17227-17322 placement
function isDeterministicError(normalizedError) {
  return (
    normalizedError !== null &&
    typeof normalizedError === "object" &&
    "deterministic" in normalizedError &&
    normalizedError.deterministic === true
  );
}
//@ chunk-zw17mz74.js:17322-17419 placement
function isConnectionDropError(error) {
  return (
    error !== null && typeof error === "object" && "connectionDrop" in error && error.connectionDrop === true
  );
}
//@ chunk-zw17mz74.js:17419-17535 placement
function getAttemptNumber(error) {
  if (error !== null && typeof error === "object" && "attempt" in error && typeof error.attempt === "number")
    return error.attempt;
  return;
}
//@ chunk-zw17mz74.js:17535-17587 placement
function safePlatform() {
  try {
    return getPlatform();
  } catch {
    return "unknown";
  }
}
//@ chunk-zw17mz74.js:17587-17813 placement
async function fetchWithDropRetry(url, requestOptions) {
  let dropRetried = false;
  for (let j = 1; ; j++)
    try {
      return {
        data: (await httpGet(url, requestOptions)).data,
        dropRetried,
      };
    } catch (error) {
      if (j >= MAX_DOWNLOAD_RETRIES || !isRetriableConnectionDrop(error)) throw error;
      dropRetried = true;
      logForDebugging(
        `Fetch of ${url} connection dropped on attempt ${j}/${MAX_DOWNLOAD_RETRIES}, retrying...`,
      );
      await sleep(RETRY_BASE_DELAY_MS);
    }
}
//@ chunk-zw17mz74.js:17908-17940 placement
/**
 * 判断自动更新是否启用。
 */
function isAutoUpdateEnabled() {
  return !isEnvDefinedFalsy(undefined);
}
export {
  isAutoUpdateEnabled,
  sha256File,
  reverifyRetainedVersion,
  ManifestSignatureError,
  isRetryableNetworkError,
  fileMatchesChecksum,
  downloadVersion,
  getLatestVersion,
  StallTimeoutError,
  ReleaseManifestError,
};
