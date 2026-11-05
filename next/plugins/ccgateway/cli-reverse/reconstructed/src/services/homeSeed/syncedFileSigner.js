/**
 * services/homeSeed/syncedFileSigner.ts
 *
 * 2.1.316 新增：同步文件请求的设备签名与通道常量
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-s1cmamfh.js (27)
 * attribution: placement 27
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { createHash } from "crypto";
import { posix } from "path";
import { uuidToBytes, DEVICE_REGISTRY_KID_PREFIX } from "../../bridge/deviceBinder.js";
import { decodeTaggedUuid } from "../mcp/serverIdentity.js";
import { resolveCurrentDeviceBinding } from "../../bridge/deviceBindingRecord.js";
import { readDeviceKeyOutcome } from "../../bridge/clientEventSigner.js";
import { logFeatureOk, logFeatureSad } from "../analytics/featureTelemetry.js";
import { DoctorLazy } from "../../cli/handlers/util.js";
import { objectSchema, stringSchema, unknown } from "../../../vendor/zod/v4/classic/schemas.js";
import { SEED_DIR, MAX_LANE_PATH_CHARS } from "../../utils/teleport/seedPaths.js";
import { logError } from "../../utils/log.js";
import { TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS } from "../../utils/errors.js";
import {
  WORKING_FILESTORE_PREFIX,
  LANE_DENIED_REASON,
  MAX_WORKING_FILE_BYTES,
} from "../syncedFiles/syncedFileSyncer.js";

//@ chunk-s1cmamfh.js:1565-1812 placement
/**
 * 内容哈希的字节数（32）。
 */
var buffer = Buffer.from("anthropic.ccr.session_synced_file_put.v1", "utf8");
var buffer_2 = Buffer.from("anthropic.ccr.session_synced_file_upload_begin.v1", "utf8");
var buffer_3 = Buffer.from("anthropic.ccr.session_synced_file_upload_commit.v1", "utf8");
var buffer_4 = Buffer.from([0]);
var CONTENT_HASH_BYTES = 32;
//@ chunk-s1cmamfh.js:1812-2090 placement
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
//@ chunk-s1cmamfh.js:2090-2380 placement
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
//@ chunk-s1cmamfh.js:2380-2584 placement
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
//@ chunk-s1cmamfh.js:2584-2859 placement
function buildSignedClaims(claims, { sessionUuid, boundDeviceUuid, issuedAtMs, fixed, strings }) {
  if (strings.some((string) => string.includes("\x00")))
    throw Error("syncedFileRequestSigner: NUL in a signed field");
  return Buffer.concat([
    claims,
    buffer_4,
    uuidToBytes(sessionUuid),
    uuidToBytes(boundDeviceUuid),
    bigUint64BE(issuedAtMs),
    ...fixed,
    ...strings.flatMap((string) => [Buffer.from(string, "utf8"), buffer_4]),
  ]);
}
//@ chunk-s1cmamfh.js:2859-2935 placement
/**
 * 把数字写成 8 字节大端 Buffer（签名载荷用）。
 */
function bigUint64BE(value) {
  let buffer = Buffer.alloc(8);
  buffer.writeBigUInt64BE(BigInt(value));
  return buffer;
}
//@ chunk-s1cmamfh.js:2935-3633 placement
/**
 * 用设备注册密钥为同步文件请求签名（kid 带设备前缀）。
 */
function createDeviceRequestSigner({ sessionUuid, deviceUuid, key, now = Date.now }) {
  let kid = DEVICE_REGISTRY_KID_PREFIX + deviceUuid;
  let signWithAttestation = async (buildClaims) => {
    let issuedAtMs = now();
    let signature = await key.sign(buildClaims(issuedAtMs));
    return {
      device_attestation: {
        kid,
        signature: signature.toString("base64"),
      },
      device_attestation_issued_at: new Date(issuedAtMs).toISOString(),
    };
  };
  let baseClaims = {
    sessionUuid,
    boundDeviceUuid: deviceUuid,
  };
  return {
    sign: ({ content, path, ifMatchSha256 }) =>
      signWithAttestation((issuedAtMs) =>
        signedContentClaims({
          ...baseClaims,
          issuedAtMs,
          contentSha256: createHash("sha256").update(content).digest(),
          path,
          ifMatchSha256,
        }),
      ),
    signBegin: ({ path, sizeBytes, ifMatchSha256 }) =>
      signWithAttestation((issuedAtMs) =>
        signedSizeClaims({
          ...baseClaims,
          issuedAtMs,
          sizeBytes,
          path,
          ifMatchSha256,
        }),
      ),
    signCommit: ({ path, uploadPath, contentSha256, ifMatchSha256 }) =>
      signWithAttestation((issuedAtMs) =>
        buildSyncedFileClaims({
          ...baseClaims,
          issuedAtMs,
          path,
          uploadPath,
          contentSha256,
          ifMatchSha256,
        }),
      ),
  };
}
//@ chunk-s1cmamfh.js:3633-4109 placement
async function createBoundDeviceSigner({ sessionId, boundDeviceUuid, credentials, held }) {
  let _ = decodeTaggedUuid(sessionId);
  if (_ === undefined) return logSignerFailure("bad_session_id");
  let opts = await resolveCurrentDeviceBinding(credentials).catch(() => {
    return;
  });
  if (opts?.status !== "resolved") return logSignerFailure("no_account");
  let lower = boundDeviceUuid.toLowerCase();
  let deviceKeyOutcome = await readDeviceKeyOutcome(
    opts.accountUuid,
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
//@ chunk-s1cmamfh.js:4109-4159 placement
/**
 * 记录请求签名失败的原因并返回 undefined。
 */
function logSignerFailure(status) {
  logFeatureSad("client_request_signer", status);
  return;
}
//@ chunk-s1cmamfh.js:4189-4386 placement
/**
 * 同步文件接口错误响应的 schema。
 */
var SYNCED_FILE_CONSTANTS = 30000;
var SYNCED_FILE_LIMIT_EXCEEDED = "synced_file_limit_exceeded";
var SYNCED_FILE_TOO_LARGE_INLINE = "synced_file_too_large_inline";
var syncedFileErrorSchema = DoctorLazy(() =>
  objectSchema({
    error: objectSchema({
      type: stringSchema().optional(),
      reason: stringSchema().optional(),
      resource: stringSchema().optional(),
      sub_reason: unknown().optional(),
    }),
  }),
);
//@ chunk-s1cmamfh.js:4386-4531 placement
function isSyncedFilePath(path) {
  if (path !== posix.normalize(path) || path.includes("\\") || path.includes("\x00")) return false;
  return !posix.isAbsolute(path) && (path === SEED_DIR || path.startsWith(`${SEED_DIR}/`));
}
//@ chunk-s1cmamfh.js:4531-4658 placement
function laneEscapeError(path) {
  if (isSyncedFilePath(path)) return false;
  logError(
    new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `lane path escapes the lane root: ${path}`,
      "lane path escapes the lane root",
    ),
  );
  return true;
}
//@ chunk-s1cmamfh.js:4658-4692 placement
function lanePath(relPath) {
  return `${WORKING_FILESTORE_PREFIX}/${relPath}`;
}
//@ chunk-s1cmamfh.js:4692-4728 placement
function isHttpSuccess(status) {
  return status >= 200 && status < 300;
}
//@ chunk-s1cmamfh.js:4728-4788 placement
function withFailedStatus(outcome, status) {
  return outcome.kind === "failed"
    ? {
        ...outcome,
        status,
      }
    : outcome;
}
//@ chunk-s1cmamfh.js:4788-4860 placement
/**
 * 判断错误 resource 是否属于合规类限制。
 */
function isComplianceResource(resource) {
  return resource === "compliance_restricted" || resource === "zdr_restricted";
}
//@ chunk-s1cmamfh.js:4860-5845 placement
function laneOutcomeOf(status) {
  if (status === "aborted")
    return {
      kind: "aborted",
    };
  if (status === "failed")
    return {
      kind: "failed",
    };
  if (status === "timed_out")
    return {
      kind: "failed",
      timedOut: true,
    };
  if (status === "too_large")
    return {
      kind: "failed",
      tooLarge: true,
    };
  if (status === "gated")
    return {
      kind: "lane_unavailable",
    };
  if (status === "no_auth")
    return {
      kind: "unauthorized",
    };
  if (status === "unsigned")
    return {
      kind: "lane_unavailable",
      cause: "device_key_unavailable",
    };
  if (status.status === 501 || status.status === 404)
    return {
      kind: "lane_unavailable",
    };
  let error = syncedFileErrorSchema().safeParse(status.data).data?.error;
  if (status.status === 400 && error?.reason === LANE_DENIED_REASON)
    return {
      kind: "lane_unavailable",
      cause: "switched_off_by_anthropic",
    };
  if (status.status === 400 && error?.reason === SYNCED_FILE_TOO_LARGE_INLINE)
    return {
      kind: "failed",
      tooLarge: true,
    };
  if (status.status === 403 && isComplianceResource(error?.resource))
    return {
      kind: "lane_unavailable",
      cause: "compliance_restricted",
    };
  if (
    status.status === 403 &&
    error?.resource === "untrusted_device" &&
    error.sub_reason === "synced_file_write_unsigned"
  )
    return {
      kind: "unauthorized",
      cause: "write_signature_refused",
    };
  if (status.status === 401 || status.status === 403)
    return {
      kind: "unauthorized",
    };
  return {
    kind: "failed",
  };
}
//@ chunk-s1cmamfh.js:5845-5854 placement
var MAX_LANE_RETRIES = 3;
//@ chunk-s1cmamfh.js:5854-5887 placement
/**
 * 上传超时的上限（100000 毫秒）。
 */
var DEFAULT_UPLOAD_TIMEOUT_MS = 300;
var TIMEOUT_CHUNKS = 4;
var UPLOAD_BYTES_BUDGET = 131072;
var MAX_UPLOAD_TIMEOUT_MS = 1e5;
//@ chunk-s1cmamfh.js:5887-5966 placement
function uploadTimeoutForSize(sizeBytes) {
  let perChunk = UPLOAD_BYTES_BUDGET / TIMEOUT_CHUNKS;
  return Math.min(
    MAX_UPLOAD_TIMEOUT_MS,
    Math.max(SYNCED_FILE_CONSTANTS, Math.ceil((sizeBytes / perChunk) * 1000)),
  );
}
//@ chunk-s1cmamfh.js:5966-5982 placement
var MAX_LANE_FILE_BYTES = 67108864;
//@ chunk-s1cmamfh.js:5982-6026 placement
function base64Length(bytes) {
  return Math.ceil((bytes * 4) / 3) + 1024;
}
//@ chunk-s1cmamfh.js:6026-6183 placement
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
//@ chunk-s1cmamfh.js:6183-6286 placement
class DeviceSignatureUnavailableError extends Error {
  constructor() {
    super("this machine cannot sign the request as the bound device");
  }
}
//@ chunk-s1cmamfh.js:6286-6398 placement
var SHA256_HEX_LENGTH = 64;
var syncedFileDigestSchema = DoctorLazy(() =>
  objectSchema({
    content_sha256: stringSchema().length(SHA256_HEX_LENGTH),
  }),
);
var syncedFileContentSchema = DoctorLazy(() =>
  objectSchema({
    content: stringSchema(),
    content_sha256: stringSchema().length(SHA256_HEX_LENGTH),
  }),
);
//@ chunk-s1cmamfh.js:6398-6487 placement
function isConnAborted(error) {
  return typeof error === "object" && error !== null && "code" in error && error.code === "ECONNABORTED";
}
//@ chunk-s1cmamfh.js:6487-6626 placement
function validateLanePath(path, maxLen) {
  if (laneEscapeError(path)) return "failed";
  if (Array.from(lanePath(path)).length > MAX_LANE_PATH_CHARS) return "path_too_long";
  if (maxLen.length > MAX_WORKING_FILE_BYTES) return "too_large";
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
  UNAVAILABLE_LANE,
  laneOutcomeOf,
  isHttpSuccess,
  syncedFileContentSchema,
  withFailedStatus,
  syncedFileDigestSchema,
  syncedFileErrorSchema,
  SYNCED_FILE_LIMIT_EXCEEDED,
  DEFAULT_UPLOAD_TIMEOUT_MS,
  createBoundDeviceSigner,
};
