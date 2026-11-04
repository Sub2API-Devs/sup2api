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
  let recoverPromise = null;
  let deviceToken;
  function recoverToken(currentToken) {
    recoverPromise ??= recoverFromUntrustedDevice(currentToken)
      .then(
        (recovered) => {
          if (recovered !== undefined) deviceToken = recovered;
          return recovered;
        },
        () => {
          return;
        },
      )
      .finally(() => {
        recoverPromise = null;
      });
    return recoverPromise;
  }
  let retryTracker = null;
  let signFailureLogged = false;
  async function runSigned(withSigner) {
    let sessionSigner = await signer?.catch(() => {
      return;
    });
    if (sessionSigner === undefined) {
      if (signedOnly) throw new DeviceSignatureUnavailableError();
      return;
    }
    try {
      return await withSigner(sessionSigner);
    } catch (error) {
      if (!signFailureLogged) {
        signFailureLogged = true;
        logForDebugging(`lane: request not signed: ${errorMessage(error)}`, {
          level: "warn",
        });
        logFeatureSad("client_request_signer", "sign_failed");
      }
      if (signedOnly) throw new DeviceSignatureUnavailableError();
      return;
    }
  }
  async function withRetry(request, signal, options = {}) {
    let tracked = options.heedsRetryAfter ? retryTracker?.trackRequest() : undefined;
    let response = await attemptLoop(request, signal, options, tracked);
    tracked?.noteSettled(response);
    return response;
  }
  async function attemptLoop(
    request,
    signal,
    { retryTimeouts = false, attempts = MAX_LANE_RETRIES },
    tracked,
  ) {
    let triedRecovery = false;
    for (let idx = 0; ; idx++) {
      if (isAborted(signal)) return "aborted";
      deviceToken ??= await getTrustedDeviceToken().catch(() => {
        return;
      });
      let token = deviceToken;
      let response;
      try {
        response = await request(
          token === undefined
            ? {}
            : {
                "X-Trusted-Device-Token": token,
              },
        );
      } catch (error) {
        if (error instanceof DeviceSignatureUnavailableError) return "unsigned";
        if (isAborted(signal)) return "aborted";
        if (await isOAuthRefreshKnownDeadAsync(credentials)) return "no_auth";
        if (isMaxContentLengthError(error)) {
          logForDebugging("lane: the response is larger than this request accepts; not retried", {
            level: "warn",
          });
          return "too_large";
        }
        if ((retryTimeouts || !isConnAborted(error)) && idx + 1 < attempts) {
          await sleep(retryDelayMs(idx), signal);
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
      if (!response.ok) return response.reason === "no-auth" ? "no_auth" : "gated";
      if (
        (response.status === 429 || (response.status >= 500 && response.status !== 501)) &&
        idx + 1 < attempts
      ) {
        let delayMs = retryDelayMs(idx);
        await sleep(
          (response.status === 429
            ? tracked?.takeWaitMs(idx, response.response?.headers?.["retry-after"], delayMs)
            : undefined) ?? delayMs,
          signal,
        );
        continue;
      }
      let refusal =
        response.status === 403 && !triedRecovery ? readUntrustedDeviceRefusal(response.data) : undefined;
      if (refusal !== undefined && shouldCloudSessionEnroll(refusal)) {
        triedRecovery = true;
        let newToken = await recoverToken(token);
        if (newToken !== undefined && newToken !== token) continue;
      } else if (refusal !== undefined) {
        logRefusalWithoutEnrollment("lane:", refusal);
        deviceToken = undefined;
        clearTrustedDeviceTokenCache();
      }
      return {
        status: response.status,
        data: response.data,
      };
    }
  }
  async function putRow(
    filePath,
    content,
    { ifMatchSha256, signal, shouldAttemptOnceIfLong: singleTryIfLong = false } = {},
  ) {
    let pathProblem = validateLanePath(filePath, content);
    if (pathProblem !== null)
      return {
        kind: pathProblem,
      };
    if (ifMatchSha256 === "")
      return {
        kind: "failed",
      };
    let timeout = uploadTimeoutForSize(base64PaddedLength(content.length));
    return parseLaneResponse(
      await requestOnce(
        filePath,
        content,
        ifMatchSha256,
        signal,
        singleTryIfLong && timeout > SYNCED_FILE_CONSTANTS ? 1 : MAX_LANE_RETRIES,
        timeout,
      ),
    );
  }
  function requestOnce(filePath, content, ifMatchSha256, signal, attempts, timeout) {
    let path = lanePath(filePath);
    return withRetry(
      async (headers) =>
        apiClient.put(
          `/v1/code/sessions/${infraSessionId}/synced_file`,
          {
            session_id: infraSessionId,
            path,
            content: content.toString("base64"),
            ...(ifMatchSha256 !== undefined && {
              if_match_sha256: ifMatchSha256,
            }),
            ...(await runSigned((signing) =>
              signing.sign({
                content,
                path,
                ifMatchSha256,
              }),
            )),
          },
          {
            auth: "teleport-org",
            credentials,
            headers,
            timeout,
            validateStatus: () => true,
            signal,
            maxBodyLength: MAX_LANE_FILE_BYTES,
          },
        ),
      signal,
      {
        attempts,
      },
    );
  }
  async function getRow(filePath, signal, knownSize = 0, maxBytes = MAX_WORKING_FILE_BYTES) {
    if (laneEscapeError(filePath))
      return {
        kind: "failed",
      };
    let uRLSearchParams = new URLSearchParams({
      path: lanePath(filePath),
    });
    let timeoutMs = uploadTimeoutForSize(base64PaddedLength(knownSize));
    let result = await withRetry(
      (headers) =>
        apiClient.get(`/v1/code/sessions/${infraSessionId}/file?${uRLSearchParams.toString()}`, {
          auth: "teleport-org",
          credentials,
          headers,
          timeout: timeoutMs,
          validateStatus: () => true,
          signal,
          maxContentLength: base64Length(maxBytes),
        }),
      signal,
      {
        attempts: timeoutMs > SYNCED_FILE_CONSTANTS ? 1 : MAX_LANE_RETRIES,
      },
    );
    if (typeof result === "string") return laneOutcomeOf(result);
    if (isHttpSuccess(result.status)) {
      let parsed = syncedFileContentSchema().safeParse(result.data);
      if (!parsed.success)
        return {
          kind: "failed",
          status: result.status,
        };
      let buffer = Buffer.from(parsed.data.content, "base64");
      return buffer.length > maxBytes
        ? {
            kind: "failed",
            status: result.status,
            tooLarge: true,
          }
        : {
            kind: "ok",
            content: buffer,
            etag: parsed.data.content_sha256,
          };
    }
    if (result.status === 404)
      return {
        kind: "not_found",
      };
    return withFailedStatus(laneOutcomeOf(result), result.status);
  }
  return {
    putStoreRow: putRow,
    getStoreRow: getRow,
    ...UNAVAILABLE_LANE,
  };
}
//@ chunk-mxpjbr4y.js:9545-10001 placement
function parseLaneResponse(response) {
  if (typeof response === "string") return laneOutcomeOf(response);
  if (isHttpSuccess(response.status)) {
    let parsed = syncedFileDigestSchema().safeParse(response.data);
    return parsed.success
      ? {
          kind: "ok",
          etag: parsed.data.content_sha256,
        }
      : {
          kind: "failed",
          status: response.status,
        };
  }
  if (response.status === 409)
    return {
      kind: "conflict",
    };
  if (response.status === 400) {
    let parsed = syncedFileErrorSchema().safeParse(response.data);
    let { type, reason } = parsed.success
      ? parsed.data.error
      : {
          type: undefined,
          reason: undefined,
        };
    logForDebugging(`lane: put rejected (400): type=${type} reason=${reason}`);
    if (reason === SYNCED_FILE_LIMIT_EXCEEDED)
      return {
        kind: "lane_full",
      };
  }
  return withFailedStatus(laneOutcomeOf(response), response.status);
}
//@ chunk-mxpjbr4y.js:10001-10040 placement
/**
 * 把字节数换算成 base64 长度（4 字节对齐）。
 */
function base64PaddedLength(length) {
  return Math.ceil(length / 3) * 4;
}
//@ chunk-mxpjbr4y.js:10040-10092 placement
/**
 * 按退避指数算重试等待（带抖动）。
 */
function retryDelayMs(attempt) {
  return DEFAULT_UPLOAD_TIMEOUT_MS * 2 ** attempt * (0.5 + Math.random() / 2);
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
