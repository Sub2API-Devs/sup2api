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
  syncedFileErrorSchema,
  SYNCED_FILE_LIMIT_EXCEEDED,
  DEFAULT_UPLOAD_TIMEOUT_MS,
} from "./syncedFileSigner.js";
import { logForDebugging } from "../../utils/debug.js";
import { errorMessage, isMaxContentLengthError } from "../../utils/errors.js";
import { logFeatureSad } from "../analytics/featureTelemetry.js";
import { isAborted } from "../../utils/abortSignalUtils.js";
import { isOAuthRefreshKnownDeadAsync } from "../../utils/auth.js";
import { sleep } from "../../utils/sleep.js";
import { logError } from "../../utils/log.js";
import { readUntrustedDeviceRefusal, shouldCloudSessionEnroll } from "../../bridge/codeSessionApi.js";
import { apiClient } from "../routines/routinesApi.js";
import { MAX_WORKING_FILE_BYTES } from "../syncedFiles/syncedFileSyncer.js";
import { canForwardHomeSettings } from "../analytics/violinGates.js";
import {
  homeSettingsForwardingFeature,
  isForwardModeEffective,
  isLaunchConsentBlocked,
} from "../../utils/teleport/homeSettingsMode.js";

//@ chunk-mxpjbr4y.js:6624-9545 placement
/**
 * 创建同步文件通道客户端：带设备签名的上传开始/提交、读取与状态查询。
 */
function createSyncedFileLane({ sessionId, credentials, signer, signedOnly = false }) {
  validateBridgeId(sessionId, "seed upload session id");
  let infraSessionId = toInfraSessionId(sessionId);
  let s = null;
  let h;
  function S(E) {
    s ??= recoverFromUntrustedDevice(E)
      .then(
        (v) => {
          if (v !== undefined) h = v;
          return v;
        },
        () => {
          return;
        },
      )
      .finally(() => {
        s = null;
      });
    return s;
  }
  let b = null;
  let w = false;
  async function R(E) {
    let v = await signer?.catch(() => {
      return;
    });
    if (v === undefined) {
      if (signedOnly) throw new DeviceSignatureUnavailableError();
      return;
    }
    try {
      return await E(v);
    } catch (error) {
      if (!w) {
        w = true;
        logForDebugging(`lane: request not signed: ${errorMessage(error)}`, {
          level: "warn",
        });
        logFeatureSad("client_request_signer", "sign_failed");
      }
      if (signedOnly) throw new DeviceSignatureUnavailableError();
      return;
    }
  }
  async function U(E, v, H = {}) {
    let T = H.heedsRetryAfter ? b?.trackRequest() : undefined;
    let x = await D(E, v, H, T);
    T?.noteSettled(x);
    return x;
  }
  async function D(E, v, { retryTimeouts = false, attempts = MAX_LANE_RETRIES }, x) {
    let I = false;
    for (let idx = 0; ; idx++) {
      if (isAborted(v)) return "aborted";
      h ??= await getTrustedDeviceToken().catch(() => {
        return;
      });
      let L = h;
      let k;
      try {
        k = await E(
          L === undefined
            ? {}
            : {
                "X-Trusted-Device-Token": L,
              },
        );
      } catch (error) {
        if (error instanceof DeviceSignatureUnavailableError) return "unsigned";
        if (isAborted(v)) return "aborted";
        if (await isOAuthRefreshKnownDeadAsync(credentials)) return "no_auth";
        if (isMaxContentLengthError(error)) {
          logForDebugging("lane: the response is larger than this request accepts; not retried", {
            level: "warn",
          });
          return "too_large";
        }
        if ((retryTimeouts || !isConnAborted(error)) && idx + 1 < attempts) {
          await sleep(retryDelayMs(idx), v);
          continue;
        }
        if (isConnAborted(error)) {
          logForDebugging("lane: request timed out", {
            level: "warn",
          });
          return "timed_out";
        }
        logError(error);
        return "failed";
      }
      if (!k.ok) return k.reason === "no-auth" ? "no_auth" : "gated";
      if ((k.status === 429 || (k.status >= 500 && k.status !== 501)) && idx + 1 < attempts) {
        let B = retryDelayMs(idx);
        await sleep(
          (k.status === 429 ? x?.takeWaitMs(idx, k.response?.headers?.["retry-after"], B) : undefined) ?? B,
          v,
        );
        continue;
      }
      let M = k.status === 403 && !I ? readUntrustedDeviceRefusal(k.data) : undefined;
      if (M !== undefined && shouldCloudSessionEnroll(M)) {
        I = true;
        let B = await S(L);
        if (B !== undefined && B !== L) continue;
      } else if (M !== undefined) {
        logRefusalWithoutEnrollment("lane:", M);
        h = undefined;
        clearTrustedDeviceTokenCache();
      }
      return {
        status: k.status,
        data: k.data,
      };
    }
  }
  async function j(E, v, { ifMatchSha256: H, signal: T, shouldAttemptOnceIfLong: x = false } = {}) {
    let I = validateLanePath(E, v);
    if (I !== null)
      return {
        kind: I,
      };
    if (H === "")
      return {
        kind: "failed",
      };
    let timeout = uploadTimeoutForSize(base64PaddedLength(v.length));
    return parseLaneResponse(
      await P(E, v, H, T, x && timeout > SYNCED_FILE_CONSTANTS ? 1 : MAX_LANE_RETRIES, timeout),
    );
  }
  function P(E, v, H, T, attempts, timeout) {
    let path = lanePath(E);
    return U(
      async (headers) =>
        apiClient.put(
          `/v1/code/sessions/${infraSessionId}/synced_file`,
          {
            session_id: infraSessionId,
            path,
            content: v.toString("base64"),
            ...(H !== undefined && {
              if_match_sha256: H,
            }),
            ...(await R((k) =>
              k.sign({
                content: v,
                path,
                ifMatchSha256: H,
              }),
            )),
          },
          {
            auth: "teleport-org",
            credentials,
            headers,
            timeout,
            validateStatus: () => true,
            signal: T,
            maxBodyLength: MAX_LANE_FILE_BYTES,
          },
        ),
      T,
      {
        attempts,
      },
    );
  }
  async function N(E, v, H = 0, T = MAX_WORKING_FILE_BYTES) {
    if (laneEscapeError(E))
      return {
        kind: "failed",
      };
    let uRLSearchParams = new URLSearchParams({
      path: lanePath(E),
    });
    let I = uploadTimeoutForSize(base64PaddedLength(H));
    let y = await U(
      (headers) =>
        apiClient.get(`/v1/code/sessions/${infraSessionId}/file?${uRLSearchParams.toString()}`, {
          auth: "teleport-org",
          credentials,
          headers,
          timeout: I,
          validateStatus: () => true,
          signal: v,
          maxContentLength: base64Length(T),
        }),
      v,
      {
        attempts: I > SYNCED_FILE_CONSTANTS ? 1 : MAX_LANE_RETRIES,
      },
    );
    if (typeof y === "string") return laneOutcomeOf(y);
    if (isHttpSuccess(y.status)) {
      let L = syncedFileContentSchema().safeParse(y.data);
      if (!L.success)
        return {
          kind: "failed",
          status: y.status,
        };
      let buffer = Buffer.from(L.data.content, "base64");
      return buffer.length > T
        ? {
            kind: "failed",
            status: y.status,
            tooLarge: true,
          }
        : {
            kind: "ok",
            content: buffer,
            etag: L.data.content_sha256,
          };
    }
    if (y.status === 404)
      return {
        kind: "not_found",
      };
    return withFailedStatus(laneOutcomeOf(y), y.status);
  }
  return {
    putStoreRow: j,
    getStoreRow: N,
    ...UNAVAILABLE_LANE,
  };
}
//@ chunk-mxpjbr4y.js:9545-10001 placement
function parseLaneResponse(e) {
  if (typeof e === "string") return laneOutcomeOf(e);
  if (isHttpSuccess(e.status)) {
    let n = syncedFileDigestSchema().safeParse(e.data);
    return n.success
      ? {
          kind: "ok",
          etag: n.data.content_sha256,
        }
      : {
          kind: "failed",
          status: e.status,
        };
  }
  if (e.status === 409)
    return {
      kind: "conflict",
    };
  if (e.status === 400) {
    let n = syncedFileErrorSchema().safeParse(e.data);
    let { type: r, reason } = n.success
      ? n.data.error
      : {
          type: undefined,
          reason: undefined,
        };
    logForDebugging(`lane: put rejected (400): type=${r} reason=${reason}`);
    if (reason === SYNCED_FILE_LIMIT_EXCEEDED)
      return {
        kind: "lane_full",
      };
  }
  return withFailedStatus(laneOutcomeOf(e), e.status);
}
//@ chunk-mxpjbr4y.js:10001-10040 placement
/**
 * 把字节数换算成 base64 长度（4 字节对齐）。
 */
function base64PaddedLength(e) {
  return Math.ceil(e / 3) * 4;
}
//@ chunk-mxpjbr4y.js:10040-10092 placement
/**
 * 按退避指数算重试等待（带抖动）。
 */
function retryDelayMs(e) {
  return DEFAULT_UPLOAD_TIMEOUT_MS * 2 ** e * (0.5 + Math.random() / 2);
}
//@ chunk-mxpjbr4y.js:10092-10103 placement
var LANE_REQUEST_TIMEOUT_MS = 1e4;
//@ chunk-mxpjbr4y.js:10103-10234 placement
async function canUseSyncedFileLane(launchConsent, isProjectStillSynced) {
  return (
    canForwardHomeSettings(homeSettingsForwardingFeature(launchConsent).enabledNow()) &&
    isForwardModeEffective(launchConsent) &&
    (!isLaunchConsentBlocked(launchConsent) ||
      (await Promise.resolve()
        .then(() => isProjectStillSynced?.() ?? false)
        .catch(() => false)))
  );
}
export { LANE_REQUEST_TIMEOUT_MS, canUseSyncedFileLane, createSyncedFileLane };
