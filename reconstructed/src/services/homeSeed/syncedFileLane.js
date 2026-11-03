/**
 * services/homeSeed/syncedFileLane.ts
 *
 * 2.1.316 新增：同步文件通道客户端
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-mxpjbr4y.js (6)
 * attribution: placement 6
 */
import { validateBridgeId, toInfraSessionId } from "../../bridge/sessionIdCompat.js";
import {
  recoverFromUntrustedDevice,
  getTrustedDeviceToken,
  logRefusalWithoutEnrollment,
  clearTrustedDeviceTokenCache,
} from "../../bridge/trustedDevice.js";
import {
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
} from "./syncedFileSigner.js";
import { logForDebugging } from "../../utils/debug.js";
import { errorMessage, isMaxContentLengthError } from "../../utils/errors.js";
import { logFeatureSad } from "../analytics/featureTelemetry.js";
import { X0 } from "../../utils/abortSignalUtils.js";
import { isOAuthRefreshKnownDeadAsync } from "../../utils/auth.js";
import { sleep } from "../../utils/sleep.js";
import { logError } from "../../utils/log.js";
import { readUntrustedDeviceRefusal, shouldCloudSessionEnroll } from "../../bridge/codeSessionApi.js";
import { apiClient } from "../routines/routinesApi.js";
import { MAX_WORKING_FILE_BYTES } from "../syncedFiles/syncedFileSyncer.js";
import { canForwardHomeSettings } from "../analytics/violinGates.js";
import { pwt, isForwardModeEffective, oN } from "../../utils/teleport/homeSettingsMode.js";

/**
 * 创建同步文件通道客户端：带设备签名的上传开始/提交、读取与状态查询。
 */
//@ chunk-mxpjbr4y.js:6624-9545 placement
function createSyncedFileLane({
  sessionId: sessionId,
  credentials: credentials,
  signer: signer,
  signedOnly: signedOnly = !1,
}) {
  validateBridgeId(sessionId, "seed upload session id");
  let _ = toInfraSessionId(sessionId),
    s = null,
    h;
  function S(E) {
    return (
      (s ??= recoverFromUntrustedDevice(E)
        .then(
          (v) => {
            if (v !== void 0) h = v;
            return v;
          },
          () => {
            return;
          },
        )
        .finally(() => {
          s = null;
        })),
      s
    );
  }
  let b = null,
    w = !1;
  async function R(E) {
    let v = await signer?.catch(() => {
      return;
    });
    if (v === void 0) {
      if (signedOnly) throw new DeviceSignatureUnavailableError();
      return;
    }
    try {
      return await E(v);
    } catch (error) {
      if (!w)
        ((w = !0),
          logForDebugging(`lane: request not signed: ${errorMessage(error)}`, { level: "warn" }),
          logFeatureSad("client_request_signer", "sign_failed"));
      if (signedOnly) throw new DeviceSignatureUnavailableError();
      return;
    }
  }
  async function U(E, v, H = {}) {
    let T = H.heedsRetryAfter ? b?.trackRequest() : void 0,
      x = await D(E, v, H, T);
    return (T?.noteSettled(x), x);
  }
  async function D(E, v, { retryTimeouts: retryTimeouts = !1, attempts: attempts = MAX_LANE_RETRIES }, x) {
    let I = !1;
    for (let y = 0; ; y++) {
      if (X0(v)) return "aborted";
      h ??= await getTrustedDeviceToken().catch(() => {
        return;
      });
      let L = h,
        k;
      try {
        k = await E(L === void 0 ? {} : { "X-Trusted-Device-Token": L });
      } catch (error) {
        if (error instanceof DeviceSignatureUnavailableError) return "unsigned";
        if (X0(v)) return "aborted";
        if (await isOAuthRefreshKnownDeadAsync(credentials)) return "no_auth";
        if (isMaxContentLengthError(error))
          return (
            logForDebugging("lane: the response is larger than this request accepts; not retried", {
              level: "warn",
            }),
            "too_large"
          );
        if ((retryTimeouts || !isConnAborted(error)) && y + 1 < attempts) {
          await sleep(ve(y), v);
          continue;
        }
        if (isConnAborted(error))
          return (logForDebugging("lane: request timed out", { level: "warn" }), "timed_out");
        return (logError(error), "failed");
      }
      if (!k.ok) return k.reason === "no-auth" ? "no_auth" : "gated";
      if ((k.status === 429 || (k.status >= 500 && k.status !== 501)) && y + 1 < attempts) {
        let B = ve(y);
        await sleep(
          (k.status === 429 ? x?.takeWaitMs(y, k.response?.headers?.["retry-after"], B) : void 0) ?? B,
          v,
        );
        continue;
      }
      let M = k.status === 403 && !I ? readUntrustedDeviceRefusal(k.data) : void 0;
      if (M !== void 0 && shouldCloudSessionEnroll(M)) {
        I = !0;
        let B = await S(L);
        if (B !== void 0 && B !== L) continue;
      } else if (M !== void 0)
        (logRefusalWithoutEnrollment("lane:", M), (h = void 0), clearTrustedDeviceTokenCache());
      return { status: k.status, data: k.data };
    }
  }
  async function j(E, v, { ifMatchSha256: H, signal: T, shouldAttemptOnceIfLong: x = !1 } = {}) {
    let I = validateLanePath(E, v);
    if (I !== null) return { kind: I };
    if (H === "") return { kind: "failed" };
    let y = uploadTimeoutForSize(Re(v.length));
    return parseLaneResponse(await P(E, v, H, T, x && y > SYNCED_FILE_CONSTANTS ? 1 : MAX_LANE_RETRIES, y));
  }
  function P(E, v, H, T, x, I) {
    let y = lanePath(E);
    return U(
      async (L) =>
        apiClient.put(
          `/v1/code/sessions/${_}/synced_file`,
          {
            session_id: _,
            path: y,
            content: v.toString("base64"),
            ...(H !== void 0 && { if_match_sha256: H }),
            ...(await R((k) => k.sign({ content: v, path: y, ifMatchSha256: H }))),
          },
          {
            auth: "teleport-org",
            credentials: credentials,
            headers: L,
            timeout: I,
            validateStatus: () => !0,
            signal: T,
            maxBodyLength: MAX_LANE_FILE_BYTES,
          },
        ),
      T,
      { attempts: x },
    );
  }
  async function N(E, v, H = 0, T = MAX_WORKING_FILE_BYTES) {
    if (laneEscapeError(E)) return { kind: "failed" };
    let uRLSearchParams = new URLSearchParams({ path: lanePath(E) }),
      I = uploadTimeoutForSize(Re(H)),
      y = await U(
        (L) =>
          apiClient.get(`/v1/code/sessions/${_}/file?${uRLSearchParams.toString()}`, {
            auth: "teleport-org",
            credentials: credentials,
            headers: L,
            timeout: I,
            validateStatus: () => !0,
            signal: v,
            maxContentLength: base64Length(T),
          }),
        v,
        { attempts: I > SYNCED_FILE_CONSTANTS ? 1 : MAX_LANE_RETRIES },
      );
    if (typeof y === "string") return laneOutcomeOf(y);
    if (isHttpSuccess(y.status)) {
      let safeParse = syncedFileContentSchema().safeParse(y.data);
      if (!safeParse.success) return { kind: "failed", status: y.status };
      let buffer = Buffer.from(safeParse.data.content, "base64");
      return buffer.length > T
        ? { kind: "failed", status: y.status, tooLarge: !0 }
        : { kind: "ok", content: buffer, etag: safeParse.data.content_sha256 };
    }
    if (y.status === 404) return { kind: "not_found" };
    return withFailedStatus(laneOutcomeOf(y), y.status);
  }
  return { putStoreRow: j, getStoreRow: N, ...UNAVAILABLE_LANE };
}
//@ chunk-mxpjbr4y.js:9545-10001 placement
function parseLaneResponse(e) {
  if (typeof e === "string") return laneOutcomeOf(e);
  if (isHttpSuccess(e.status)) {
    let safeParse = syncedFileDigestSchema().safeParse(e.data);
    return safeParse.success
      ? { kind: "ok", etag: safeParse.data.content_sha256 }
      : { kind: "failed", status: e.status };
  }
  if (e.status === 409) return { kind: "conflict" };
  if (e.status === 400) {
    let safeParse = te().safeParse(e.data),
      { type: r, reason: reason } = safeParse.success
        ? safeParse.data.error
        : { type: void 0, reason: void 0 };
    if (
      (logForDebugging(`lane: put rejected (400): type=${r} reason=${reason}`),
      reason === SYNCED_FILE_LIMIT_EXCEEDED)
    )
      return { kind: "lane_full" };
  }
  return withFailedStatus(laneOutcomeOf(e), e.status);
}
//@ chunk-mxpjbr4y.js:10001-10040 placement
function Re(e) {
  return Math.ceil(e / 3) * 4;
}
//@ chunk-mxpjbr4y.js:10040-10092 placement
function ve(e) {
  return ot * 2 ** e * (0.5 + Math.random() / 2);
}
//@ chunk-mxpjbr4y.js:10092-10103 placement
var LANE_REQUEST_TIMEOUT_MS = 1e4;
//@ chunk-mxpjbr4y.js:10103-10234 placement
async function canUseSyncedFileLane(e, n) {
  return (
    canForwardHomeSettings(pwt(e).enabledNow()) &&
    isForwardModeEffective(e) &&
    (!oN(e) ||
      (await Promise.resolve()
        .then(() => n?.() ?? !1)
        .catch(() => !1)))
  );
}

export { LANE_REQUEST_TIMEOUT_MS, canUseSyncedFileLane, createSyncedFileLane };
