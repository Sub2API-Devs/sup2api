/**
 * services/homeSeed/syncedFileSigner.ts
 *
 * 2.1.316 新增：同步文件请求的设备签名与通道常量
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-mxpjbr4y.js (27)
 * attribution: placement 27
 */
import { createHash } from "crypto";
import { posix } from "path";
import { uuidToBytes, DEVICE_REGISTRY_KID_PREFIX } from "../../bridge/deviceBinder.js";
import { decodeTaggedUuid } from "../mcp/serverIdentity.js";
import { resolveCurrentDeviceBinding } from "../../bridge/deviceBindingRecord.js";
import { readDeviceKeyOutcome } from "../../bridge/clientEventSigner.js";
import { logFeatureOk, logFeatureSad } from "../analytics/featureTelemetry.js";
import { DoctorLazy } from "../../cli/handlers/util.js";
import { u, string, unknown } from "../../../vendor/zod/v4/classic/schemas.js";
import { SEED_DIR, MAX_LANE_PATH_CHARS } from "../../utils/teleport/seedPaths.js";
import { logError } from "../../utils/log.js";
import { TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS } from "../../utils/errors.js";
import {
  WORKING_FILESTORE_PREFIX,
  LANE_DENIED_REASON,
  MAX_WORKING_FILE_BYTES,
} from "../syncedFiles/syncedFileSyncer.js";

//@ chunk-mxpjbr4y.js:1564-1811 placement
/**
 * 内容哈希的字节数（32）。
 */
var buffer = Buffer.from("anthropic.ccr.session_synced_file_put.v1", "utf8");
var buffer_2 = Buffer.from("anthropic.ccr.session_synced_file_upload_begin.v1", "utf8");
var buffer_3 = Buffer.from("anthropic.ccr.session_synced_file_upload_commit.v1", "utf8");
var buffer_4 = Buffer.from([0]);
var CONTENT_HASH_BYTES = 32;
//@ chunk-mxpjbr4y.js:1811-2089 placement
function signedContentClaims({
  sessionUuid,
  boundDeviceUuid,
  issuedAtMs,
  contentSha256,
  path,
  ifMatchSha256,
}) {
  if (contentSha256.length !== CONTENT_HASH_BYTES)
    throw Error("syncedFileRequestSigner: the content hash is not 32 bytes");
  return buildSignedClaims(buffer, {
    sessionUuid,
    boundDeviceUuid,
    issuedAtMs,
    fixed: [contentSha256],
    strings: [path, ifMatchSha256 ?? ""],
  });
}
//@ chunk-mxpjbr4y.js:2089-2379 placement
function signedSizeClaims({ sessionUuid, boundDeviceUuid, issuedAtMs, sizeBytes, path, ifMatchSha256 }) {
  if (!Number.isSafeInteger(sizeBytes) || sizeBytes < 0)
    throw Error("syncedFileRequestSigner: the size is not a byte count");
  return buildSignedClaims(buffer_2, {
    sessionUuid,
    boundDeviceUuid,
    issuedAtMs,
    fixed: [bigUint64BE(sizeBytes)],
    strings: [path, ifMatchSha256 ?? ""],
  });
}
//@ chunk-mxpjbr4y.js:2379-2583 placement
function buildSyncedFileClaims({
  sessionUuid,
  boundDeviceUuid,
  issuedAtMs,
  path,
  uploadPath,
  contentSha256,
  ifMatchSha256,
}) {
  return buildSignedClaims(buffer_3, {
    sessionUuid,
    boundDeviceUuid,
    issuedAtMs,
    fixed: [],
    strings: [path, uploadPath, contentSha256, ifMatchSha256 ?? ""],
  });
}
//@ chunk-mxpjbr4y.js:2583-2858 placement
function buildSignedClaims(e, { sessionUuid, boundDeviceUuid, issuedAtMs, fixed, strings }) {
  if (strings.some((string) => string.includes("\x00")))
    throw Error("syncedFileRequestSigner: NUL in a signed field");
  return Buffer.concat([
    e,
    buffer_4,
    uuidToBytes(sessionUuid),
    uuidToBytes(boundDeviceUuid),
    bigUint64BE(issuedAtMs),
    ...fixed,
    ...strings.flatMap((string) => [Buffer.from(string, "utf8"), buffer_4]),
  ]);
}
//@ chunk-mxpjbr4y.js:2858-2934 placement
/**
 * 把数字写成 8 字节大端 Buffer（签名载荷用）。
 */
function bigUint64BE(e) {
  let n = Buffer.alloc(8);
  n.writeBigUInt64BE(BigInt(e));
  return n;
}
//@ chunk-mxpjbr4y.js:2934-3632 placement
/**
 * 用设备注册密钥为同步文件请求签名（kid 带设备前缀）。
 */
function createDeviceRequestSigner({ sessionUuid, deviceUuid, key, now = Date.now }) {
  let kid = DEVICE_REGISTRY_KID_PREFIX + deviceUuid;
  let s = async (S) => {
    let b = now();
    let w = await key.sign(S(b));
    return {
      device_attestation: {
        kid,
        signature: w.toString("base64"),
      },
      device_attestation_issued_at: new Date(b).toISOString(),
    };
  };
  let h = {
    sessionUuid,
    boundDeviceUuid: deviceUuid,
  };
  return {
    sign: ({ content, path, ifMatchSha256 }) =>
      s((issuedAtMs) =>
        signedContentClaims({
          ...h,
          issuedAtMs,
          contentSha256: createHash("sha256").update(content).digest(),
          path,
          ifMatchSha256,
        }),
      ),
    signBegin: ({ path, sizeBytes, ifMatchSha256 }) =>
      s((issuedAtMs) =>
        signedSizeClaims({
          ...h,
          issuedAtMs,
          sizeBytes,
          path,
          ifMatchSha256,
        }),
      ),
    signCommit: ({ path, uploadPath, contentSha256, ifMatchSha256 }) =>
      s((issuedAtMs) =>
        buildSyncedFileClaims({
          ...h,
          issuedAtMs,
          path,
          uploadPath,
          contentSha256,
          ifMatchSha256,
        }),
      ),
  };
}
//@ chunk-mxpjbr4y.js:3632-4107 placement
async function createBoundDeviceSigner({ sessionId, boundDeviceUuid, credentials, held }) {
  let _ = decodeTaggedUuid(sessionId);
  if (_ === undefined) return logSignerFailure("bad_session_id");
  let s = await resolveCurrentDeviceBinding(credentials).catch(() => {
    return;
  });
  if (s?.status !== "resolved") return logSignerFailure("no_account");
  let lower = boundDeviceUuid.toLowerCase();
  let deviceKeyOutcome = await readDeviceKeyOutcome(
    s.accountUuid,
    credentials,
    held?.rowPk.toLowerCase() === lower ? held : undefined,
  );
  if (deviceKeyOutcome.status !== "loaded") return logSignerFailure(deviceKeyOutcome.status);
  if (deviceKeyOutcome.rowPk.toLowerCase() !== lower) return logSignerFailure("bound_elsewhere");
  logFeatureOk("client_request_signer");
  return createDeviceRequestSigner({
    sessionUuid: _,
    deviceUuid: lower,
    key: deviceKeyOutcome.key,
  });
}
//@ chunk-mxpjbr4y.js:4107-4157 placement
/**
 * 记录请求签名失败的原因并返回 undefined。
 */
function logSignerFailure(status) {
  logFeatureSad("client_request_signer", status);
  return;
}
//@ chunk-mxpjbr4y.js:4187-4384 placement
/**
 * 同步文件接口错误响应的 schema。
 */
var SYNCED_FILE_CONSTANTS = 30000;
var SYNCED_FILE_LIMIT_EXCEEDED = "synced_file_limit_exceeded";
var SYNCED_FILE_TOO_LARGE_INLINE = "synced_file_too_large_inline";
var syncedFileErrorSchema = DoctorLazy(() =>
  u({
    error: u({
      type: string().optional(),
      reason: string().optional(),
      resource: string().optional(),
      sub_reason: unknown().optional(),
    }),
  }),
);
//@ chunk-mxpjbr4y.js:4384-4529 placement
function isSyncedFilePath(e) {
  if (e !== posix.normalize(e) || e.includes("\\") || e.includes("\x00")) return false;
  return !posix.isAbsolute(e) && (e === SEED_DIR || e.startsWith(`${SEED_DIR}/`));
}
//@ chunk-mxpjbr4y.js:4529-4656 placement
function laneEscapeError(e) {
  if (isSyncedFilePath(e)) return false;
  logError(
    new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `lane path escapes the lane root: ${e}`,
      "lane path escapes the lane root",
    ),
  );
  return true;
}
//@ chunk-mxpjbr4y.js:4656-4690 placement
function lanePath(e) {
  return `${WORKING_FILESTORE_PREFIX}/${e}`;
}
//@ chunk-mxpjbr4y.js:4690-4726 placement
function isHttpSuccess(status) {
  return status >= 200 && status < 300;
}
//@ chunk-mxpjbr4y.js:4726-4786 placement
function withFailedStatus(e, status) {
  return e.kind === "failed"
    ? {
        ...e,
        status,
      }
    : e;
}
//@ chunk-mxpjbr4y.js:4786-4858 placement
/**
 * 判断错误 resource 是否属于合规类限制。
 */
function isComplianceResource(resource) {
  return resource === "compliance_restricted" || resource === "zdr_restricted";
}
//@ chunk-mxpjbr4y.js:4858-5843 placement
function laneOutcomeOf(e) {
  if (e === "aborted")
    return {
      kind: "aborted",
    };
  if (e === "failed")
    return {
      kind: "failed",
    };
  if (e === "timed_out")
    return {
      kind: "failed",
      timedOut: true,
    };
  if (e === "too_large")
    return {
      kind: "failed",
      tooLarge: true,
    };
  if (e === "gated")
    return {
      kind: "lane_unavailable",
    };
  if (e === "no_auth")
    return {
      kind: "unauthorized",
    };
  if (e === "unsigned")
    return {
      kind: "lane_unavailable",
      cause: "device_key_unavailable",
    };
  if (e.status === 501 || e.status === 404)
    return {
      kind: "lane_unavailable",
    };
  let error = syncedFileErrorSchema().safeParse(e.data).data?.error;
  if (e.status === 400 && error?.reason === LANE_DENIED_REASON)
    return {
      kind: "lane_unavailable",
      cause: "switched_off_by_anthropic",
    };
  if (e.status === 400 && error?.reason === SYNCED_FILE_TOO_LARGE_INLINE)
    return {
      kind: "failed",
      tooLarge: true,
    };
  if (e.status === 403 && isComplianceResource(error?.resource))
    return {
      kind: "lane_unavailable",
      cause: "compliance_restricted",
    };
  if (
    e.status === 403 &&
    error?.resource === "untrusted_device" &&
    error.sub_reason === "synced_file_write_unsigned"
  )
    return {
      kind: "unauthorized",
      cause: "write_signature_refused",
    };
  if (e.status === 401 || e.status === 403)
    return {
      kind: "unauthorized",
    };
  return {
    kind: "failed",
  };
}
//@ chunk-mxpjbr4y.js:5843-5852 placement
var MAX_LANE_RETRIES = 3;
//@ chunk-mxpjbr4y.js:5852-5885 placement
/**
 * 上传超时的上限（100000 毫秒）。
 */
var DEFAULT_UPLOAD_TIMEOUT_MS = 300;
var TIMEOUT_CHUNKS = 4;
var UPLOAD_BYTES_BUDGET = 131072;
var MAX_UPLOAD_TIMEOUT_MS = 1e5;
//@ chunk-mxpjbr4y.js:5885-5964 placement
function uploadTimeoutForSize(e) {
  let n = UPLOAD_BYTES_BUDGET / TIMEOUT_CHUNKS;
  return Math.min(MAX_UPLOAD_TIMEOUT_MS, Math.max(SYNCED_FILE_CONSTANTS, Math.ceil((e / n) * 1000)));
}
//@ chunk-mxpjbr4y.js:5964-5980 placement
var MAX_LANE_FILE_BYTES = 67108864;
//@ chunk-mxpjbr4y.js:5980-6024 placement
function base64Length(e) {
  return Math.ceil((e * 4) / 3) + 1024;
}
//@ chunk-mxpjbr4y.js:6024-6181 placement
var UNAVAILABLE_LANE = {
  beginUpload: async () => ({
    kind: "lane_unavailable",
  }),
  commitUpload: async () => ({
    kind: "lane_unavailable",
  }),
  getDownload: async () => ({
    kind: "lane_unavailable",
  }),
};
//@ chunk-mxpjbr4y.js:6181-6284 placement
class DeviceSignatureUnavailableError extends Error {
  constructor() {
    super("this machine cannot sign the request as the bound device");
  }
}
//@ chunk-mxpjbr4y.js:6284-6396 placement
var SHA256_HEX_LENGTH = 64;
var syncedFileDigestSchema = DoctorLazy(() =>
  u({
    content_sha256: string().length(SHA256_HEX_LENGTH),
  }),
);
var syncedFileContentSchema = DoctorLazy(() =>
  u({
    content: string(),
    content_sha256: string().length(SHA256_HEX_LENGTH),
  }),
);
//@ chunk-mxpjbr4y.js:6396-6485 placement
function isConnAborted(error) {
  return typeof error === "object" && error !== null && "code" in error && error.code === "ECONNABORTED";
}
//@ chunk-mxpjbr4y.js:6485-6624 placement
function validateLanePath(e, n) {
  if (laneEscapeError(e)) return "failed";
  if (Array.from(lanePath(e)).length > MAX_LANE_PATH_CHARS) return "path_too_long";
  if (n.length > MAX_WORKING_FILE_BYTES) return "too_large";
  return null;
}
export {
  DeviceSignatureUnavailableError,
  MAX_LANE_RETRIES,
  isConnAborted,
  validateLanePath,
  uploadTimeoutForSize,
  SYNCED_FILE_CONSTANTS,
  lanePath,
  MAX_LANE_FILE_BYTES,
  laneEscapeError,
  base64Length,
  laneOutcomeOf,
  isHttpSuccess,
  syncedFileContentSchema,
  withFailedStatus,
  UNAVAILABLE_LANE,
  syncedFileDigestSchema,
  syncedFileErrorSchema,
  SYNCED_FILE_LIMIT_EXCEEDED,
  DEFAULT_UPLOAD_TIMEOUT_MS,
  createBoundDeviceSigner,
};
