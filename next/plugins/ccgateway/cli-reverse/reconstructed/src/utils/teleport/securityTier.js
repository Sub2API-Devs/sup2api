/**
 * utils/teleport/securityTier.ts
 *
 * 云会话安全等级请求（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-7jxyna5q.js (8)
 * attribution: placement 8
 */
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../../services/analytics/growthbook.js";
import { isTrustedDeviceActiveForOrg } from "../../bridge/trustedDevice.js";
import { trustedDeviceHeaders } from "./api.js";
import { DoctorLazy } from "../../cli/handlers/util.js";
import { objectSchema, _enum, unknown, stringSchema } from "../../../vendor/zod/v4/classic/schemas.js";
import { logFeatureOk, logFeatureSad } from "../../services/analytics/featureTelemetry.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-7jxyna5q.js:391830-391899 placement
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
//@ chunk-7jxyna5q.js:391899-392067 placement
async function planTrustedDeviceProof() {
  if (!isSecurityTierEnabled() || !isTrustedDeviceActiveForOrg())
    return {
      kind: "off",
    };
  let headers = await trustedDeviceHeaders().catch(() => ({}));
  return Object.keys(headers).length > 0
    ? {
        kind: "ask",
        proofHeaders: headers,
      }
    : {
        kind: "no_token",
      };
}
//@ chunk-7jxyna5q.js:392067-392105 placement
/**
 * 可信设备证明是否生效（模式非 off）。
 */
function isTrustedDeviceProofActive(securityAsk) {
  return securityAsk.kind !== "off";
}
//@ chunk-7jxyna5q.js:392105-392178 placement
var securityTierResponseSchema; // deferred: uses DoctorLazy (../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-7jxyna5q.js:392105", () => {
  securityTierResponseSchema = DoctorLazy(() =>
    objectSchema({
      session: objectSchema({
        security_tier: _enum(["elevated", "standard"]),
      }),
    }),
  );
});
//@ chunk-7jxyna5q.js:392178-392271 placement
/**
 * 从响应里取 session.security_tier。
 */
function securityTierOfResponse(body) {
  let parsed = securityTierResponseSchema().safeParse(body);
  return parsed.success ? parsed.data.session.security_tier : undefined;
}
//@ chunk-7jxyna5q.js:392271-392440 placement
var securityTierErrorSchema; // deferred: uses DoctorLazy (../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-7jxyna5q.js:392271", () => {
  securityTierErrorSchema = DoctorLazy(() =>
    objectSchema({
      error: objectSchema({
        message: unknown().optional(),
        reason: stringSchema().optional().catch(undefined),
        resource: stringSchema().optional().catch(undefined),
        sub_reason: stringSchema().optional().catch(undefined),
      }),
    }),
  );
});
//@ chunk-7jxyna5q.js:392440-392806 placement
function requestSecurityTier(body) {
  let parsed = securityTierErrorSchema().safeParse(body);
  if (!parsed.success) return "refused";
  let { reason, resource, sub_reason: subReason } = parsed.data.error;
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
//@ chunk-7jxyna5q.js:392806-392900 placement
/**
 * 记录安全等级请求结果。
 */
function logSecurityTierOutcome(outcome) {
  if (outcome === "honored") logFeatureOk("cloud_elevated_create");
  else logFeatureSad("cloud_elevated_create", outcome);
}
export {
  isSecurityTierEnabled,
  securityTierErrorSchema,
  planTrustedDeviceProof,
  isTrustedDeviceProofActive,
  requestSecurityTier,
  logSecurityTierOutcome,
  securityTierOfResponse,
};
