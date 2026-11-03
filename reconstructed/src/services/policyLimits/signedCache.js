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
    let { result: o } = verifyCacheSignature({
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
    return o === "valid" || o === "unsigned" ? o : "invalid";
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
    let K = {
      jws: signature?.jws,
      kind,
      orgUuid,
      accountUuid,
      workspaceUuid,
      bodySha,
      nowMs,
      roots: isSecDefaultPluginEnabled(),
    };
    let b = verifyCacheSignature({
      ...K,
      unanchoredClaims: "refuse",
    });
    let verification =
      (b.result === "aud_mismatch" && orgUuid === undefined) ||
      (b.result === "sub_mismatch" && accountUuid === undefined)
        ? verifyCacheSignature({
            ...K,
            unanchoredClaims: "accept",
          })
        : b;
    let verifyMicros = Math.round((performance.now() - startTime) * 1000);
    let O = evaluateTrustWithPin({
      held: {
        orgUuid,
        accountUuid,
        workspaceUuid,
      },
      readOrgPin,
      verification,
    });
    try {
      onJudged(O);
    } catch (error) {
      logForDebugging(`signed-cache: telling the loader failed: ${errorMessage(error)}`, {
        level: "error",
      });
    }
    logEvent("tengu_signed_cache_shadow", {
      cache: fromEnum(kind),
      result: fromEnum(b.result),
      age_s: b.ageSeconds,
      cert_hours_left: b.certHoursLeft,
      verify_micros: verifyMicros,
      has_org_uuid: orgUuid !== undefined,
      has_account_uuid: accountUuid !== undefined,
      has_workspace_uuid: workspaceUuid !== undefined,
      ws_unanchored: b.wsUnanchored === true,
      absence: b.absence === true,
      states_lifetime: b.statesLifetime === true,
      stored_copy: fromEnum(cacheTrustLabel(O)),
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
    let { result: u } = verifyCacheSignature({
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
    if (u !== "aud_mismatch" && u !== "sub_mismatch") return;
    logEvent("tengu_signed_cache_principal_change", {
      cache: fromEnum(kind),
      differs: fromEnum(u === "aud_mismatch" ? "aud" : "sub"),
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
function policyLimitsUrl(e) {
  return `${e}${POLICY_LIMITS_PATH}`;
}
//@ chunk-7t4fmt2f.js:12593-13420 placement
async function fetchPolicyLimitsResponse(e) {
  let r = await axios_default
    .get(e.endpoint, {
      headers: {
        "User-Agent": claudeCodeUserAgent(),
        ...NO_CACHE_HEADERS,
        ...(e.ifNoneMatch !== undefined && {
          "If-None-Match": `"${e.ifNoneMatch}"`,
        }),
        ...e.authHeaders,
      },
      timeout: e.timeoutMs,
      maxRedirects: 0,
      adapter: "http",
      validateStatus: e.acceptAny2xx
        ? (h) => (h >= 200 && h < 300) || h === 304
        : (h) => h === 200 || h === 304,
      ...(e.socketPath !== undefined && {
        socketPath: e.socketPath,
      }),
      ...(e.signal !== undefined && {
        signal: e.signal,
      }),
    })
    .catch((error) => {
      if (axios_default.isAxiosError(error) && error.code === "ECONNABORTED" && error.request?.res)
        error.code = "ERR_BAD_RESPONSE";
      throw error;
    });
  let headers = r.headers ?? {};
  let signature = signatureHeaderValue(headers);
  let u = headers[TUNNEL_CREDENTIAL_EPOCH_HEADER];
  let tunnelCredentialEpoch = parseEpochNumber(typeof u === "string" ? u : undefined);
  if (r.status === 304)
    return {
      kind: "not_modified",
      signature,
      requestIdPresent: hasSessionsTokenRequestId(headers),
      tunnelCredentialEpoch,
    };
  return {
    kind: "ok",
    data: r.data,
    signature,
    contentType: String(headers["content-type"] ?? "").toLowerCase(),
    requestIdPresent: hasSessionsTokenRequestId(headers),
    tunnelCredentialEpoch,
  };
}
//@ chunk-7t4fmt2f.js:13420-13539 placement = isTransientNetworkError (1)
function isTransientNetworkError(error) {
  if (!axios_default.isAxiosError(error)) return;
  let r = error.response?.headers?.[TUNNEL_CREDENTIAL_EPOCH_HEADER];
  return parseEpochNumber(typeof r === "string" ? r : undefined);
}
export {
  fetchPolicyLimitsResponse,
  isTransientNetworkError,
  verifyStoredCacheAsync,
  logPrincipalChange,
  verifyLiveAnswerSignature,
  policyLimitsUrl,
};
