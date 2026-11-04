/**
 * services/policyLimits/signedCache.ts
 *
 * 2.1.316 新增。策略签名缓存（JWS 校验）。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-7t4fmt2f.js (9)
 * attribution: placement 9
 */
import {
  verifyCacheSignature,
  readSignatureAsync,
  cacheTrustLabel,
  evaluateCacheTrust,
  SIGNED_CACHE_ROOT_FINGERPRINT,
  signatureHeaderValue,
} from "../../utils/settings/policyCertificates.js";
import { isSecDefaultPluginEnabled } from "../../utils/plugins/securityDefaultPlugin.js";
import { logForDebugging } from "../../utils/debug.js";
import { errorMessage } from "../../utils/errors.js";
import { logEvent } from "../analytics/index.js";
import { fromEnum } from "../analytics/safeMetadata.js";
import { POLICY_LIMITS_PATH } from "./index.js";
import { axios_default } from "../../../vendor/axios/dist/esm/axios.js";
import { claudeCodeUserAgent } from "../../utils/http.js";
import { TUNNEL_CREDENTIAL_EPOCH_HEADER, parseEpochNumber } from "../../utils/auth/credentialEpoch.js";
import { hasSessionsTokenRequestId } from "../api/errorUtils.js";

//@ chunk-7t4fmt2f.js:10080-10451 placement
/**
 * 校验在线响应的 JWS 签名（valid/unsigned/invalid/no_answer）。
 */
function verifyLiveAnswerSignature({ kind, answer, account }) {
  if (answer === undefined) return "no_answer";
  try {
    let { result: verificationResult } = verifyCacheSignature({
      jws: answer.jws,
      kind,
      orgUuid: account?.organizationUuid || undefined,
      accountUuid: account?.accountUuid || undefined,
      workspaceUuid: account?.workspaceUuid || undefined,
      unanchoredClaims: "accept",
      bodySha: answer.bodySha(),
      nowMs: Date.now(),
      roots: isSecDefaultPluginEnabled(),
    });
    return verificationResult === "valid" || verificationResult === "unsigned"
      ? verificationResult
      : "invalid";
  } catch {
    return "invalid";
  }
}
//@ chunk-7t4fmt2f.js:10451-11479 placement
async function verifySignedCache({
  kind,
  cachePath,
  bodySha,
  orgUuid,
  accountUuid,
  workspaceUuid,
  readOrgPin,
  onJudged,
}) {
  try {
    let signature = await readSignatureAsync(cachePath);
    let nowMs = Date.now();
    let startTime = performance.now();
    let verifyInput = {
      jws: signature?.jws,
      kind,
      orgUuid,
      accountUuid,
      workspaceUuid,
      bodySha,
      nowMs,
      roots: isSecDefaultPluginEnabled(),
    };
    let strictVerification = verifyCacheSignature({
      ...verifyInput,
      unanchoredClaims: "refuse",
    });
    let verification =
      (strictVerification.result === "aud_mismatch" && orgUuid === undefined) ||
      (strictVerification.result === "sub_mismatch" && accountUuid === undefined)
        ? verifyCacheSignature({
            ...verifyInput,
            unanchoredClaims: "accept",
          })
        : strictVerification;
    let verifyMicros = Math.round((performance.now() - startTime) * 1000);
    let trustEvaluation = evaluateTrustWithPin({
      held: {
        orgUuid,
        accountUuid,
        workspaceUuid,
      },
      readOrgPin,
      verification,
    });
    try {
      onJudged(trustEvaluation);
    } catch (error) {
      logForDebugging(`signed-cache: telling the loader failed: ${errorMessage(error)}`, {
        level: "error",
      });
    }
    logEvent("tengu_signed_cache_shadow", {
      cache: fromEnum(kind),
      result: fromEnum(strictVerification.result),
      age_s: strictVerification.ageSeconds,
      cert_hours_left: strictVerification.certHoursLeft,
      verify_micros: verifyMicros,
      has_org_uuid: orgUuid !== undefined,
      has_account_uuid: accountUuid !== undefined,
      has_workspace_uuid: workspaceUuid !== undefined,
      ws_unanchored: strictVerification.wsUnanchored === true,
      absence: strictVerification.absence === true,
      states_lifetime: strictVerification.statesLifetime === true,
      stored_copy: fromEnum(cacheTrustLabel(trustEvaluation)),
    });
  } catch (error) {
    logForDebugging(`Signed cache: shadow check failed (${kind}) - ${errorMessage(error)}`);
  }
}
//@ chunk-7t4fmt2f.js:11479-11722 placement
function evaluateTrustWithPin({ held, readOrgPin, verification }) {
  try {
    return evaluateCacheTrust({
      verification,
      held,
      pinnedOrgs: readOrgPin(),
    });
  } catch (error) {
    logForDebugging(`signed-cache: the organization pin could not be read: ${errorMessage(error)}`, {
      level: "error",
    });
    return {
      trusted: false,
      reason: "org_pin_unknown",
    };
  }
}
//@ chunk-7t4fmt2f.js:11722-12016 placement
/**
 * 后台校验已存缓存的签名（忽略错误）。
 */
function verifyStoredCacheAsync({ kind, cachePath, bodySha, readStoredAccount, readOrgPin, onJudged }) {
  try {
    let storedAccount = readStoredAccount();
    verifySignedCache({
      kind,
      cachePath,
      bodySha,
      orgUuid: storedAccount?.organizationUuid || undefined,
      accountUuid: storedAccount?.accountUuid || undefined,
      workspaceUuid: storedAccount?.workspaceUuid || undefined,
      readOrgPin,
      onJudged,
    }).catch(() => {});
  } catch {}
}
//@ chunk-7t4fmt2f.js:12016-12504 placement
/**
 * 签名主体（aud/sub）与当前主体不同时上报。
 */
function logPrincipalChange({ kind, jws, trustedPrincipal, gate }) {
  try {
    if (jws === undefined) return;
    let { result: mismatchResult } = verifyCacheSignature({
      jws,
      kind,
      orgUuid: trustedPrincipal.orgUuid,
      accountUuid: trustedPrincipal.accountUuid,
      workspaceUuid: trustedPrincipal.workspaceUuid,
      unanchoredClaims: "refuse",
      bodySha: SIGNED_CACHE_ROOT_FINGERPRINT,
      nowMs: Date.now(),
      roots: isSecDefaultPluginEnabled(),
    });
    if (mismatchResult !== "aud_mismatch" && mismatchResult !== "sub_mismatch") return;
    logEvent("tengu_signed_cache_principal_change", {
      cache: fromEnum(kind),
      differs: fromEnum(mismatchResult === "aud_mismatch" ? "aud" : "sub"),
      stored_copy_gate: fromEnum(gate),
    });
  } catch (error) {
    logForDebugging(`signed-cache: live principal check failed: ${errorMessage(error)}`);
  }
}
//@ chunk-7t4fmt2f.js:12504-12558 placement
/**
 * 禁用缓存的请求头（Cache-Control / Pragma）。
 */
var NO_CACHE_HEADERS = {
  "Cache-Control": "no-cache",
  Pragma: "no-cache",
};
//@ chunk-7t4fmt2f.js:12558-12593 placement
/**
 * 拼出策略限制接口的完整地址。
 */
function policyLimitsUrl(baseUrl) {
  return `${baseUrl}${POLICY_LIMITS_PATH}`;
}
//@ chunk-7t4fmt2f.js:12593-13420 placement
async function fetchPolicyLimitsResponse(requestOptions) {
  let response = await axios_default
    .get(requestOptions.endpoint, {
      headers: {
        "User-Agent": claudeCodeUserAgent(),
        ...NO_CACHE_HEADERS,
        ...(requestOptions.ifNoneMatch !== undefined && {
          "If-None-Match": `"${requestOptions.ifNoneMatch}"`,
        }),
        ...requestOptions.authHeaders,
      },
      timeout: requestOptions.timeoutMs,
      maxRedirects: 0,
      adapter: "http",
      validateStatus: requestOptions.acceptAny2xx
        ? (status) => (status >= 200 && status < 300) || status === 304
        : (status) => status === 200 || status === 304,
      ...(requestOptions.socketPath !== undefined && {
        socketPath: requestOptions.socketPath,
      }),
      ...(requestOptions.signal !== undefined && {
        signal: requestOptions.signal,
      }),
    })
    .catch((error) => {
      if (axios_default.isAxiosError(error) && error.code === "ECONNABORTED" && error.request?.res)
        error.code = "ERR_BAD_RESPONSE";
      throw error;
    });
  let headers = response.headers ?? {};
  let signature = signatureHeaderValue(headers);
  let rawEpochHeader = headers[TUNNEL_CREDENTIAL_EPOCH_HEADER];
  let tunnelCredentialEpoch = parseEpochNumber(
    typeof rawEpochHeader === "string" ? rawEpochHeader : undefined,
  );
  if (response.status === 304)
    return {
      kind: "not_modified",
      signature,
      requestIdPresent: hasSessionsTokenRequestId(headers),
      tunnelCredentialEpoch,
    };
  return {
    kind: "ok",
    data: response.data,
    signature,
    contentType: String(headers["content-type"] ?? "").toLowerCase(),
    requestIdPresent: hasSessionsTokenRequestId(headers),
    tunnelCredentialEpoch,
  };
}
//@ chunk-7t4fmt2f.js:13420-13539 placement = isTransientNetworkError (1)
function isTransientNetworkError(error) {
  if (!axios_default.isAxiosError(error)) return;
  let rawEpochHeader = error.response?.headers?.[TUNNEL_CREDENTIAL_EPOCH_HEADER];
  return parseEpochNumber(typeof rawEpochHeader === "string" ? rawEpochHeader : undefined);
}
export {
  fetchPolicyLimitsResponse,
  isTransientNetworkError,
  verifyStoredCacheAsync,
  logPrincipalChange,
  verifyLiveAnswerSignature,
  policyLimitsUrl,
};
