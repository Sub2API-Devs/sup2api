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
  Pxi,
  yOt,
  evaluateCacheTrust,
  SIGNED_CACHE_ROOT_FINGERPRINT,
  BXt,
} from "../../utils/settings/policyCertificates.js";
import { isSecDefaultPluginEnabled } from "../../utils/plugins/securityDefaultPlugin.js";
import { logForDebugging } from "../../utils/debug.js";
import { errorMessage } from "../../utils/errors.js";
import { logEvent } from "../analytics/index.js";
import { fromEnum } from "../analytics/safeMetadata.js";
import { POLICY_LIMITS_PATH } from "./index.js";
import { Dt } from "../../../vendor/axios/dist/esm/axios.js";
import { claudeCodeUserAgent } from "../../utils/http.js";
import { TUNNEL_CREDENTIAL_EPOCH_HEADER, xto } from "../../utils/auth/credentialEpoch.js";
import { k5e } from "../api/errorUtils.js";

/**
 * 校验在线响应的 JWS 签名（valid/unsigned/invalid/no_answer）。
 */
//@ chunk-7t4fmt2f.js:10080-10451 placement
function verifyLiveAnswerSignature({ kind: kind, answer: answer, account: account }) {
  if (answer === void 0) return "no_answer";
  try {
    let { result: o } = verifyCacheSignature({
      jws: answer.jws,
      kind: kind,
      orgUuid: account?.organizationUuid || void 0,
      accountUuid: account?.accountUuid || void 0,
      workspaceUuid: account?.workspaceUuid || void 0,
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
  kind: kind,
  cachePath: cachePath,
  bodySha: bodySha,
  orgUuid: orgUuid,
  accountUuid: accountUuid,
  workspaceUuid: workspaceUuid,
  readOrgPin: readOrgPin,
  onJudged: onJudged,
}) {
  try {
    let E = await Pxi(cachePath),
      now = Date.now(),
      startTime = performance.now(),
      K = {
        jws: E?.jws,
        kind: kind,
        orgUuid: orgUuid,
        accountUuid: accountUuid,
        workspaceUuid: workspaceUuid,
        bodySha: bodySha,
        nowMs: now,
        roots: isSecDefaultPluginEnabled(),
      },
      b = verifyCacheSignature({ ...K, unanchoredClaims: "refuse" }),
      w =
        (b.result === "aud_mismatch" && orgUuid === void 0) ||
        (b.result === "sub_mismatch" && accountUuid === void 0)
          ? verifyCacheSignature({ ...K, unanchoredClaims: "accept" })
          : b,
      rounded = Math.round((performance.now() - startTime) * 1000),
      O = evaluateTrustWithPin({
        held: { orgUuid: orgUuid, accountUuid: accountUuid, workspaceUuid: workspaceUuid },
        readOrgPin: readOrgPin,
        verification: w,
      });
    try {
      onJudged(O);
    } catch (error) {
      logForDebugging(`signed-cache: telling the loader failed: ${errorMessage(error)}`, { level: "error" });
    }
    logEvent("tengu_signed_cache_shadow", {
      cache: fromEnum(kind),
      result: fromEnum(b.result),
      age_s: b.ageSeconds,
      cert_hours_left: b.certHoursLeft,
      verify_micros: rounded,
      has_org_uuid: orgUuid !== void 0,
      has_account_uuid: accountUuid !== void 0,
      has_workspace_uuid: workspaceUuid !== void 0,
      ws_unanchored: b.wsUnanchored === !0,
      absence: b.absence === !0,
      states_lifetime: b.statesLifetime === !0,
      stored_copy: fromEnum(yOt(O)),
    });
  } catch (error) {
    logForDebugging(`Signed cache: shadow check failed (${kind}) - ${errorMessage(error)}`);
  }
}
//@ chunk-7t4fmt2f.js:11479-11722 placement
function evaluateTrustWithPin({ held: held, readOrgPin: readOrgPin, verification: verification }) {
  try {
    return evaluateCacheTrust({ verification: verification, held: held, pinnedOrgs: readOrgPin() });
  } catch (error) {
    return (
      logForDebugging(`signed-cache: the organization pin could not be read: ${errorMessage(error)}`, {
        level: "error",
      }),
      { trusted: !1, reason: "org_pin_unknown" }
    );
  }
}
/**
 * 后台校验已存缓存的签名（忽略错误）。
 */
//@ chunk-7t4fmt2f.js:11722-12016 placement
function verifyStoredCacheAsync({
  kind: kind,
  cachePath: cachePath,
  bodySha: bodySha,
  readStoredAccount: readStoredAccount,
  readOrgPin: readOrgPin,
  onJudged: onJudged,
}) {
  try {
    let h = readStoredAccount();
    verifySignedCache({
      kind: kind,
      cachePath: cachePath,
      bodySha: bodySha,
      orgUuid: h?.organizationUuid || void 0,
      accountUuid: h?.accountUuid || void 0,
      workspaceUuid: h?.workspaceUuid || void 0,
      readOrgPin: readOrgPin,
      onJudged: onJudged,
    }).catch(() => {});
  } catch {}
}
/**
 * 签名主体（aud/sub）与当前主体不同时上报。
 */
//@ chunk-7t4fmt2f.js:12016-12504 placement
function logPrincipalChange({ kind: kind, jws: jws, trustedPrincipal: trustedPrincipal, gate: gate }) {
  try {
    if (jws === void 0) return;
    let { result: u } = verifyCacheSignature({
      jws: jws,
      kind: kind,
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
var si = { "Cache-Control": "no-cache", Pragma: "no-cache" };
//@ chunk-7t4fmt2f.js:12558-12593 placement
function L7r(e) {
  return `${e}${POLICY_LIMITS_PATH}`;
}
//@ chunk-7t4fmt2f.js:12593-13420 placement
async function fetchPolicyLimitsResponse(e) {
  let r = await Dt.get(e.endpoint, {
      headers: {
        "User-Agent": claudeCodeUserAgent(),
        ...si,
        ...(e.ifNoneMatch !== void 0 && { "If-None-Match": `"${e.ifNoneMatch}"` }),
        ...e.authHeaders,
      },
      timeout: e.timeoutMs,
      maxRedirects: 0,
      adapter: "http",
      validateStatus: e.acceptAny2xx
        ? (h) => (h >= 200 && h < 300) || h === 304
        : (h) => h === 200 || h === 304,
      ...(e.socketPath !== void 0 && { socketPath: e.socketPath }),
      ...(e.signal !== void 0 && { signal: e.signal }),
    }).catch((h) => {
      if (Dt.isAxiosError(h) && h.code === "ECONNABORTED" && h.request?.res) h.code = "ERR_BAD_RESPONSE";
      throw h;
    }),
    n = r.headers ?? {},
    o = BXt(n),
    u = n[TUNNEL_CREDENTIAL_EPOCH_HEADER],
    p = xto(typeof u === "string" ? u : void 0);
  if (r.status === 304)
    return { kind: "not_modified", signature: o, requestIdPresent: k5e(n), tunnelCredentialEpoch: p };
  return {
    kind: "ok",
    data: r.data,
    signature: o,
    contentType: String(n["content-type"] ?? "").toLowerCase(),
    requestIdPresent: k5e(n),
    tunnelCredentialEpoch: p,
  };
}
//@ chunk-7t4fmt2f.js:13420-13539 placement = isTransientNetworkError (1)
function isTransientNetworkError(error) {
  if (!Dt.isAxiosError(error)) return;
  let r = error.response?.headers?.[TUNNEL_CREDENTIAL_EPOCH_HEADER];
  return xto(typeof r === "string" ? r : void 0);
}

export {
  fetchPolicyLimitsResponse,
  isTransientNetworkError,
  verifyStoredCacheAsync,
  logPrincipalChange,
  verifyLiveAnswerSignature,
  L7r,
};
