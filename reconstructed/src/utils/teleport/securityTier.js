/**
 * utils/teleport/securityTier.ts
 *
 * 云会话安全等级请求（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-s61vbvea.js (8)
 * attribution: placement 8
 */
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../../services/analytics/growthbook.js";
import { isTrustedDeviceActiveForOrg } from "../../bridge/trustedDevice.js";
import { trustedDeviceHeaders } from "./api.js";
import { DoctorLazy } from "../../cli/handlers/util.js";
import { u, _enum, unknown, string } from "../../../vendor/zod/v4/classic/schemas.js";
import { logFeatureOk, logFeatureSad } from "../../services/analytics/featureTelemetry.js";

//@ chunk-s61vbvea.js:474352-474421 placement
/**
 * 安全等级请求开关（tengu_breezy_fairy）。
 */
function isSecurityTierEnabled() {
  try {
    return getFeatureValue_CACHED_MAY_BE_STALE("tengu_breezy_fairy", false);
  } catch {
    return false;
  }
}
//@ chunk-s61vbvea.js:474421-474589 placement
async function planTrustedDeviceProof() {
  if (!isSecurityTierEnabled() || !isTrustedDeviceActiveForOrg())
    return {
      kind: "off",
    };
  let e = await trustedDeviceHeaders().catch(() => ({}));
  return Object.keys(e).length > 0
    ? {
        kind: "ask",
        proofHeaders: e,
      }
    : {
        kind: "no_token",
      };
}
//@ chunk-s61vbvea.js:474589-474627 placement
/**
 * 可信设备证明是否生效（模式非 off）。
 */
function isTrustedDeviceProofActive(securityAsk) {
  return securityAsk.kind !== "off";
}
//@ chunk-s61vbvea.js:474627-474700 placement
var securityTierResponseSchema = DoctorLazy(() =>
  u({
    session: u({
      security_tier: _enum(["elevated", "standard"]),
    }),
  }),
);
//@ chunk-s61vbvea.js:474700-474793 placement
/**
 * 从响应里取 session.security_tier。
 */
function securityTierOfResponse(e) {
  let n = securityTierResponseSchema().safeParse(e);
  return n.success ? n.data.session.security_tier : undefined;
}
//@ chunk-s61vbvea.js:474793-474962 placement
var securityTierErrorSchema = DoctorLazy(() =>
  u({
    error: u({
      message: unknown().optional(),
      reason: string().optional().catch(undefined),
      resource: string().optional().catch(undefined),
      sub_reason: string().optional().catch(undefined),
    }),
  }),
);
//@ chunk-s61vbvea.js:474962-475328 placement
function requestSecurityTier(e) {
  let n = securityTierErrorSchema().safeParse(e);
  if (!n.success) return "refused";
  let { reason, resource, sub_reason: subReason } = n.data.error;
  if (reason === "security_tier_request_unsupported") return "unsupported";
  if (subReason !== "security_tier_request") return "refused";
  switch (resource) {
    case "untrusted_device":
      return "untrusted_device";
    case "device_check_unavailable":
      return "unavailable";
    default:
      return "refused";
  }
}
//@ chunk-s61vbvea.js:475328-475422 placement
/**
 * 记录安全等级请求结果。
 */
function logSecurityTierOutcome(e) {
  if (e === "honored") logFeatureOk("cloud_elevated_create");
  else logFeatureSad("cloud_elevated_create", e);
}
export {
  isSecurityTierEnabled,
  planTrustedDeviceProof,
  isTrustedDeviceProofActive,
  requestSecurityTier,
  logSecurityTierOutcome,
  securityTierOfResponse,
  securityTierErrorSchema,
};
