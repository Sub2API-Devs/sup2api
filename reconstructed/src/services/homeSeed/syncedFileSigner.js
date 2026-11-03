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
import { u, o, oe } from "../../../vendor/zod/v4/classic/schemas.js";
import { SEED_DIR, IWs } from "../../utils/teleport/seedPaths.js";
import { logError } from "../../utils/log.js";
import { TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS } from "../../utils/errors.js";
import {
  WORKING_FILESTORE_PREFIX,
  LANE_DENIED_REASON,
  MAX_WORKING_FILE_BYTES,
} from "../syncedFiles/syncedFileSyncer.js";

//@ chunk-mxpjbr4y.js:1564-1811 placement
var buffer = Buffer.from("anthropic.ccr.session_synced_file_put.v1", "utf8"),
  buffer_2 = Buffer.from("anthropic.ccr.session_synced_file_upload_begin.v1", "utf8"),
  buffer_3 = Buffer.from("anthropic.ccr.session_synced_file_upload_commit.v1", "utf8"),
  buffer_4 = Buffer.from([0]),
  Ve = 32;
//@ chunk-mxpjbr4y.js:1811-2089 placement
function signedContentClaims({
  sessionUuid: sessionUuid,
  boundDeviceUuid: boundDeviceUuid,
  issuedAtMs: issuedAtMs,
  contentSha256: contentSha256,
  path: path,
  ifMatchSha256: ifMatchSha256,
}) {
  if (contentSha256.length !== Ve) throw Error("syncedFileRequestSigner: the content hash is not 32 bytes");
  return buildSignedClaims(buffer, {
    sessionUuid: sessionUuid,
    boundDeviceUuid: boundDeviceUuid,
    issuedAtMs: issuedAtMs,
    fixed: [contentSha256],
    strings: [path, ifMatchSha256 ?? ""],
  });
}
//@ chunk-mxpjbr4y.js:2089-2379 placement
function signedSizeClaims({
  sessionUuid: sessionUuid,
  boundDeviceUuid: boundDeviceUuid,
  issuedAtMs: issuedAtMs,
  sizeBytes: sizeBytes,
  path: path,
  ifMatchSha256: ifMatchSha256,
}) {
  if (!Number.isSafeInteger(sizeBytes) || sizeBytes < 0)
    throw Error("syncedFileRequestSigner: the size is not a byte count");
  return buildSignedClaims(buffer_2, {
    sessionUuid: sessionUuid,
    boundDeviceUuid: boundDeviceUuid,
    issuedAtMs: issuedAtMs,
    fixed: [_e(sizeBytes)],
    strings: [path, ifMatchSha256 ?? ""],
  });
}
//@ chunk-mxpjbr4y.js:2379-2583 placement
function buildSyncedFileClaims({
  sessionUuid: sessionUuid,
  boundDeviceUuid: boundDeviceUuid,
  issuedAtMs: issuedAtMs,
  path: path,
  uploadPath: uploadPath,
  contentSha256: contentSha256,
  ifMatchSha256: ifMatchSha256,
}) {
  return buildSignedClaims(buffer_3, {
    sessionUuid: sessionUuid,
    boundDeviceUuid: boundDeviceUuid,
    issuedAtMs: issuedAtMs,
    fixed: [],
    strings: [path, uploadPath, contentSha256, ifMatchSha256 ?? ""],
  });
}
//@ chunk-mxpjbr4y.js:2583-2858 placement
function buildSignedClaims(
  e,
  {
    sessionUuid: sessionUuid,
    boundDeviceUuid: boundDeviceUuid,
    issuedAtMs: issuedAtMs,
    fixed: fixed,
    strings: strings,
  },
) {
  if (strings.some((h) => h.includes("\x00"))) throw Error("syncedFileRequestSigner: NUL in a signed field");
  return Buffer.concat([
    e,
    buffer_4,
    uuidToBytes(sessionUuid),
    uuidToBytes(boundDeviceUuid),
    _e(issuedAtMs),
    ...fixed,
    ...strings.flatMap((h) => [Buffer.from(h, "utf8"), buffer_4]),
  ]);
}
//@ chunk-mxpjbr4y.js:2858-2934 placement
function _e(e) {
  let alloc = Buffer.alloc(8);
  return (alloc.writeBigUInt64BE(BigInt(e)), alloc);
}
/**
 * 用设备注册密钥为同步文件请求签名（kid 带设备前缀）。
 */
//@ chunk-mxpjbr4y.js:2934-3632 placement
function createDeviceRequestSigner({
  sessionUuid: sessionUuid,
  deviceUuid: deviceUuid,
  key: key,
  now: now = Date.now,
}) {
  let _ = DEVICE_REGISTRY_KID_PREFIX + deviceUuid,
    s = async (S) => {
      let b = now(),
        sign = await key.sign(S(b));
      return {
        device_attestation: { kid: _, signature: sign.toString("base64") },
        device_attestation_issued_at: new Date(b).toISOString(),
      };
    },
    h = { sessionUuid: sessionUuid, boundDeviceUuid: deviceUuid };
  return {
    sign: ({ content: content, path: path, ifMatchSha256: ifMatchSha256 }) =>
      s((R) =>
        signedContentClaims({
          ...h,
          issuedAtMs: R,
          contentSha256: createHash("sha256").update(content).digest(),
          path: path,
          ifMatchSha256: ifMatchSha256,
        }),
      ),
    signBegin: ({ path: path, sizeBytes: sizeBytes, ifMatchSha256: ifMatchSha256 }) =>
      s((R) =>
        signedSizeClaims({
          ...h,
          issuedAtMs: R,
          sizeBytes: sizeBytes,
          path: path,
          ifMatchSha256: ifMatchSha256,
        }),
      ),
    signCommit: ({
      path: path,
      uploadPath: uploadPath,
      contentSha256: contentSha256,
      ifMatchSha256: ifMatchSha256,
    }) =>
      s((U) =>
        buildSyncedFileClaims({
          ...h,
          issuedAtMs: U,
          path: path,
          uploadPath: uploadPath,
          contentSha256: contentSha256,
          ifMatchSha256: ifMatchSha256,
        }),
      ),
  };
}
//@ chunk-mxpjbr4y.js:3632-4107 placement
async function createBoundDeviceSigner({
  sessionId: sessionId,
  boundDeviceUuid: boundDeviceUuid,
  credentials: credentials,
  held: held,
}) {
  let _ = decodeTaggedUuid(sessionId);
  if (_ === void 0) return W("bad_session_id");
  let s = await resolveCurrentDeviceBinding(credentials).catch(() => {
    return;
  });
  if (s?.status !== "resolved") return W("no_account");
  let lower = boundDeviceUuid.toLowerCase(),
    S = await readDeviceKeyOutcome(
      s.accountUuid,
      credentials,
      held?.rowPk.toLowerCase() === lower ? held : void 0,
    );
  if (S.status !== "loaded") return W(S.status);
  if (S.rowPk.toLowerCase() !== lower) return W("bound_elsewhere");
  return (
    logFeatureOk("client_request_signer"),
    createDeviceRequestSigner({ sessionUuid: _, deviceUuid: lower, key: S.key })
  );
}
//@ chunk-mxpjbr4y.js:4107-4157 placement
function W(e) {
  logFeatureSad("client_request_signer", e);
  return;
}
//@ chunk-mxpjbr4y.js:4187-4384 placement
var SYNCED_FILE_CONSTANTS = 30000,
  SYNCED_FILE_LIMIT_EXCEEDED = "synced_file_limit_exceeded",
  SYNCED_FILE_TOO_LARGE_INLINE = "synced_file_too_large_inline",
  te = DoctorLazy(() =>
    u({
      error: u({
        type: o().optional(),
        reason: o().optional(),
        resource: o().optional(),
        sub_reason: oe().optional(),
      }),
    }),
  );
//@ chunk-mxpjbr4y.js:4384-4529 placement
function isSyncedFilePath(e) {
  if (e !== posix.normalize(e) || e.includes("\\") || e.includes("\x00")) return !1;
  return !posix.isAbsolute(e) && (e === SEED_DIR || e.startsWith(`${SEED_DIR}/`));
}
//@ chunk-mxpjbr4y.js:4529-4656 placement
function laneEscapeError(e) {
  if (isSyncedFilePath(e)) return !1;
  return (
    logError(
      new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `lane path escapes the lane root: ${e}`,
        "lane path escapes the lane root",
      ),
    ),
    !0
  );
}
//@ chunk-mxpjbr4y.js:4656-4690 placement
function lanePath(e) {
  return `${WORKING_FILESTORE_PREFIX}/${e}`;
}
//@ chunk-mxpjbr4y.js:4690-4726 placement
function isHttpSuccess(e) {
  return e >= 200 && e < 300;
}
//@ chunk-mxpjbr4y.js:4726-4786 placement
function withFailedStatus(e, n) {
  return e.kind === "failed" ? { ...e, status: n } : e;
}
//@ chunk-mxpjbr4y.js:4786-4858 placement
function nt(e) {
  return e === "compliance_restricted" || e === "zdr_restricted";
}
//@ chunk-mxpjbr4y.js:4858-5843 placement
function laneOutcomeOf(e) {
  if (e === "aborted") return { kind: "aborted" };
  if (e === "failed") return { kind: "failed" };
  if (e === "timed_out") return { kind: "failed", timedOut: !0 };
  if (e === "too_large") return { kind: "failed", tooLarge: !0 };
  if (e === "gated") return { kind: "lane_unavailable" };
  if (e === "no_auth") return { kind: "unauthorized" };
  if (e === "unsigned") return { kind: "lane_unavailable", cause: "device_key_unavailable" };
  if (e.status === 501 || e.status === 404) return { kind: "lane_unavailable" };
  let n = te().safeParse(e.data).data?.error;
  if (e.status === 400 && n?.reason === LANE_DENIED_REASON)
    return { kind: "lane_unavailable", cause: "switched_off_by_anthropic" };
  if (e.status === 400 && n?.reason === SYNCED_FILE_TOO_LARGE_INLINE) return { kind: "failed", tooLarge: !0 };
  if (e.status === 403 && nt(n?.resource))
    return { kind: "lane_unavailable", cause: "compliance_restricted" };
  if (e.status === 403 && n?.resource === "untrusted_device" && n.sub_reason === "synced_file_write_unsigned")
    return { kind: "unauthorized", cause: "write_signature_refused" };
  if (e.status === 401 || e.status === 403) return { kind: "unauthorized" };
  return { kind: "failed" };
}
//@ chunk-mxpjbr4y.js:5843-5852 placement
var MAX_LANE_RETRIES = 3;
//@ chunk-mxpjbr4y.js:5852-5885 placement
var ot = 300,
  it = 4,
  at = 131072,
  st = 1e5;
//@ chunk-mxpjbr4y.js:5885-5964 placement
function uploadTimeoutForSize(e) {
  let n = at / it;
  return Math.min(st, Math.max(SYNCED_FILE_CONSTANTS, Math.ceil((e / n) * 1000)));
}
//@ chunk-mxpjbr4y.js:5964-5980 placement
var MAX_LANE_FILE_BYTES = 67108864;
//@ chunk-mxpjbr4y.js:5980-6024 placement
function base64Length(e) {
  return Math.ceil((e * 4) / 3) + 1024;
}
//@ chunk-mxpjbr4y.js:6024-6181 placement
var UNAVAILABLE_LANE = {
  beginUpload: async () => ({ kind: "lane_unavailable" }),
  commitUpload: async () => ({ kind: "lane_unavailable" }),
  getDownload: async () => ({ kind: "lane_unavailable" }),
};
//@ chunk-mxpjbr4y.js:6181-6284 placement
class DeviceSignatureUnavailableError extends Error {
  constructor() {
    super("this machine cannot sign the request as the bound device");
  }
}
//@ chunk-mxpjbr4y.js:6284-6396 placement
var SHA256_HEX_LENGTH = 64,
  syncedFileDigestSchema = DoctorLazy(() => u({ content_sha256: o().length(SHA256_HEX_LENGTH) })),
  syncedFileContentSchema = DoctorLazy(() =>
    u({ content: o(), content_sha256: o().length(SHA256_HEX_LENGTH) }),
  );
//@ chunk-mxpjbr4y.js:6396-6485 placement
function isConnAborted(e) {
  return typeof e === "object" && e !== null && "code" in e && e.code === "ECONNABORTED";
}
//@ chunk-mxpjbr4y.js:6485-6624 placement
function validateLanePath(e, n) {
  if (laneEscapeError(e)) return "failed";
  if (Array.from(lanePath(e)).length > IWs) return "path_too_long";
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
  te,
  SYNCED_FILE_LIMIT_EXCEEDED,
  ot,
  createBoundDeviceSigner,
};
