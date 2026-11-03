/**
 * services/promo/promoState.ts
 *
 * 促销状态（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-s61vbvea.js (18)
 * attribution: placement 18
 */
import { DoctorLazy } from "../../cli/handlers/util.js";
import { u, M, oe, o, E, hu } from "../../../vendor/zod/v4/classic/schemas.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../analytics/growthbook.js";

//@ chunk-s61vbvea.js:513035-513067 placement
var jH = /^\/v1(\/[a-z0-9_-]+)+$/;
//@ chunk-s61vbvea.js:513067-513122 placement
function vtr(e) {
  return typeof e === "string" && jH.test(e);
}
//@ chunk-s61vbvea.js:513122-513294 placement
var PROMO_STATES = ["not_claimed", "pending", "active", "expired", "claimed_elsewhere"],
  promoStatusSchema = DoctorLazy(() =>
    u({
      eligible: M().default(!1),
      claimed: M().default(!1),
      state: oe().transform(normalizePromoState).optional(),
    }),
  );
//@ chunk-s61vbvea.js:513294-513362 placement
function zH(e) {
  let safeParse = promoStatusSchema().safeParse(e);
  return safeParse.success ? safeParse.data : null;
}
//@ chunk-s61vbvea.js:513362-513716 placement
function parsePromoState({ httpStatus: httpStatus, body: body }) {
  if (httpStatus >= 200 && httpStatus < 300) {
    if (typeof body !== "object" || body === null || !("eligible" in body || "claimed" in body))
      return { kind: "no_answer", reason: "body" };
    let s = zH(body);
    return s === null ? { kind: "not_eligible", reason: "body" } : { kind: "answered", status: s };
  }
  return {
    kind:
      httpStatus >= 400 && httpStatus < 500 && httpStatus !== 408 && httpStatus !== 429
        ? "not_eligible"
        : "no_answer",
    reason: "http",
    httpStatus: httpStatus,
  };
}
//@ chunk-s61vbvea.js:513716-513840 placement
function normalizePromoState(e) {
  if (typeof e !== "string") return;
  let replaced = e.toLowerCase().replace(/^[a-z_]*_state_/, "");
  return PROMO_STATES.find((r) => r === replaced);
}
//@ chunk-s61vbvea.js:513840-513891 placement
var TENGU_SWIFT_LYNX = "tengu_swift_lynx",
  qH = /^(\/[a-z0-9_-]+)+$/;
//@ chunk-s61vbvea.js:513891-513946 placement
function E_n(e) {
  return typeof e === "string" && qH.test(e);
}
//@ chunk-s61vbvea.js:513946-514017 placement
function qw(e, n) {
  return `${e.endsWith("/") ? `/${e.slice(1, -1)}` : e}/${n}`;
}
//@ chunk-s61vbvea.js:514017-514099 placement
function ani(e, n) {
  return { webPath: qw(e.webPath, n), desktopPath: qw(e.desktopPath, n) };
}
//@ chunk-s61vbvea.js:514099-514171 placement
var XH = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
//@ chunk-s61vbvea.js:514171-514266 placement
function a4o(e, n) {
  let r = typeof n === "string" ? n.toLowerCase() : "";
  return XH.test(r) ? `${e}/${r}` : e;
}
//@ chunk-s61vbvea.js:514266-514374 placement
var MAX_PROMO_TEXT_CHARS = 120,
  promoTextSchema = DoctorLazy(() =>
    o()
      .trim()
      .min(1)
      .max(MAX_PROMO_TEXT_CHARS)
      .regex(/^\P{Cc}*$/u),
  ),
  DEFAULT_PROMO_STATUS_MAX_AGE_SECONDS = 3600,
  promoStatusMaxAgeSchema = DoctorLazy(() => E().min(0).catch(DEFAULT_PROMO_STATUS_MAX_AGE_SECONDS));
//@ chunk-s61vbvea.js:514374-514444 placement
function V4r(e, n, r) {
  if (n === 0) return !1;
  let s = r - e;
  return s < 0 || s >= n * 1000;
}
//@ chunk-s61vbvea.js:514444-514610 placement
var promoConfigSchema = DoctorLazy(() =>
  u({
    version: E().default(0),
    endpoint: hu(vtr),
    webPath: hu(E_n),
    desktopPath: hu(E_n),
    claimLinkIncludesOrganization: M().optional(),
    statusMaxAgeSeconds: promoStatusMaxAgeSchema(),
  }),
);
//@ chunk-s61vbvea.js:514610-514690 placement
var CLAIM_CREDIT = "claim-credit",
  ZH = DoctorLazy(() => u({ startup: u({ text: promoTextSchema(), claimPageLine: promoTextSchema() }) }));
//@ chunk-s61vbvea.js:514690-514856 placement
function parsePromoConfig(e) {
  let safeParse = promoConfigSchema().safeParse(e);
  if (!safeParse.success) return null;
  let safeParse_2 = ZH().safeParse(e);
  return {
    ...safeParse.data,
    claimPageLine: safeParse_2.success ? safeParse_2.data.startup.claimPageLine : null,
  };
}
//@ chunk-s61vbvea.js:514856-514928 placement
function ktr() {
  let e = getFeatureValue_CACHED_MAY_BE_STALE(TENGU_SWIFT_LYNX, null);
  return e === null || e === void 0 ? null : parsePromoConfig(e);
}

export {
  E_n,
  CLAIM_CREDIT,
  ktr,
  V4r,
  vtr,
  DEFAULT_PROMO_STATUS_MAX_AGE_SECONDS,
  parsePromoState,
  promoConfigSchema,
  TENGU_SWIFT_LYNX,
  a4o,
  ani,
};
