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
import { u, U, oe, o } from "../../../vendor/zod/v4/classic/schemas.js";
import { logFeatureOk, logFeatureSad } from "../../services/analytics/featureTelemetry.js";

//@ chunk-s61vbvea.js:474352-474421 placement
function jqo() {
  try {
    return getFeatureValue_CACHED_MAY_BE_STALE("tengu_breezy_fairy", !1);
  } catch {
    return !1;
  }
}
//@ chunk-s61vbvea.js:474421-474589 placement
async function planTrustedDeviceProof() {
  if (!jqo() || !isTrustedDeviceActiveForOrg()) return { kind: "off" };
  let e = await trustedDeviceHeaders().catch(() => ({}));
  return Object.keys(e).length > 0 ? { kind: "ask", proofHeaders: e } : { kind: "no_token" };
}
//@ chunk-s61vbvea.js:474589-474627 placement
function sti(e) {
  return e.kind !== "off";
}
//@ chunk-s61vbvea.js:474627-474700 placement
var kF = DoctorLazy(() => u({ session: u({ security_tier: U(["elevated", "standard"]) }) }));
//@ chunk-s61vbvea.js:474700-474793 placement
function iti(e) {
  let safeParse = kF().safeParse(e);
  return safeParse.success ? safeParse.data.session.security_tier : void 0;
}
//@ chunk-s61vbvea.js:474793-474962 placement
var securityTierErrorSchema = DoctorLazy(() =>
  u({
    error: u({
      message: oe().optional(),
      reason: o()
        .optional()
        .catch(void 0),
      resource: o()
        .optional()
        .catch(void 0),
      sub_reason: o()
        .optional()
        .catch(void 0),
    }),
  }),
);
//@ chunk-s61vbvea.js:474962-475328 placement
function requestSecurityTier(e) {
  let safeParse = securityTierErrorSchema().safeParse(e);
  if (!safeParse.success) return "refused";
  let { reason: reason, resource: resource, sub_reason: sub_reason } = safeParse.data.error;
  if (reason === "security_tier_request_unsupported") return "unsupported";
  if (sub_reason !== "security_tier_request") return "refused";
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
function zqo(e) {
  if (e === "honored") logFeatureOk("cloud_elevated_create");
  else logFeatureSad("cloud_elevated_create", e);
}

export { jqo, planTrustedDeviceProof, sti, requestSecurityTier, zqo, iti, securityTierErrorSchema };
