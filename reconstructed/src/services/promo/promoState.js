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
import { u, M, unknown, string, E, hu } from "../../../vendor/zod/v4/classic/schemas.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../analytics/growthbook.js";

//@ chunk-s61vbvea.js:513035-513067 placement
var ABSOLUTE_PROMO_PATH_REGEX = /^\/v1(\/[a-z0-9_-]+)+$/;
//@ chunk-s61vbvea.js:513067-513122 placement
/**
 * 判断字符串是不是以 /v1 开头的绝对促销页面路径。
 */
function isAbsolutePromoPath(e) {
  return typeof e === "string" && ABSOLUTE_PROMO_PATH_REGEX.test(e);
}
//@ chunk-s61vbvea.js:513122-513294 placement
var PROMO_STATES = ["not_claimed", "pending", "active", "expired", "claimed_elsewhere"];
var promoStatusSchema = DoctorLazy(() =>
  u({
    eligible: M().default(false),
    claimed: M().default(false),
    state: unknown().transform(normalizePromoState).optional(),
  }),
);
//@ chunk-s61vbvea.js:513294-513362 placement
function parsePromoStatus(body) {
  let n = promoStatusSchema().safeParse(body);
  return n.success ? n.data : null;
}
//@ chunk-s61vbvea.js:513362-513716 placement
function parsePromoState({ httpStatus, body }) {
  if (httpStatus >= 200 && httpStatus < 300) {
    if (typeof body !== "object" || body === null || !("eligible" in body || "claimed" in body))
      return {
        kind: "no_answer",
        reason: "body",
      };
    let promoStatus = parsePromoStatus(body);
    return promoStatus === null
      ? {
          kind: "not_eligible",
          reason: "body",
        }
      : {
          kind: "answered",
          status: promoStatus,
        };
  }
  return {
    kind:
      httpStatus >= 400 && httpStatus < 500 && httpStatus !== 408 && httpStatus !== 429
        ? "not_eligible"
        : "no_answer",
    reason: "http",
    httpStatus,
  };
}
//@ chunk-s61vbvea.js:513716-513840 placement
function normalizePromoState(e) {
  if (typeof e !== "string") return;
  let replaced = e.toLowerCase().replace(/^[a-z_]*_state_/, "");
  return PROMO_STATES.find((r) => r === replaced);
}
//@ chunk-s61vbvea.js:513840-513891 placement
/**
 * 匹配相对 promo 路径的正则。
 */
var TENGU_SWIFT_LYNX = "tengu_swift_lynx";
var RELATIVE_PROMO_PATH_REGEX = /^(\/[a-z0-9_-]+)+$/;
//@ chunk-s61vbvea.js:513891-513946 placement
/**
 * 判断字符串是不是以 / 开头的相对促销页面路径。
 */
function isRelativePromoPath(e) {
  return typeof e === "string" && RELATIVE_PROMO_PATH_REGEX.test(e);
}
//@ chunk-s61vbvea.js:513946-514017 placement
function joinPromoPath(e, n) {
  return `${e.endsWith("/") ? `/${e.slice(1, -1)}` : e}/${n}`;
}
//@ chunk-s61vbvea.js:514017-514099 placement
/**
 * 把同一子路径同时追加到 web 与 desktop 两种促销路径上。
 */
function appendPromoSubpath(e, n) {
  return {
    webPath: joinPromoPath(e.webPath, n),
    desktopPath: joinPromoPath(e.desktopPath, n),
  };
}
//@ chunk-s61vbvea.js:514099-514171 placement
var UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
//@ chunk-s61vbvea.js:514171-514266 placement
/**
 * 组织 id 是 UUID 时把它追加到促销路径后，否则返回原路径。
 */
function appendOrgIdIfUuid(e, n) {
  let r = typeof n === "string" ? n.toLowerCase() : "";
  return UUID_REGEX.test(r) ? `${e}/${r}` : e;
}
//@ chunk-s61vbvea.js:514266-514374 placement
var MAX_PROMO_TEXT_CHARS = 120;
var promoTextSchema = DoctorLazy(() =>
  string()
    .trim()
    .min(1)
    .max(MAX_PROMO_TEXT_CHARS)
    .regex(/^\P{Cc}*$/u),
);
var DEFAULT_PROMO_STATUS_MAX_AGE_SECONDS = 3600;
var promoStatusMaxAgeSchema = DoctorLazy(() => E().min(0).catch(DEFAULT_PROMO_STATUS_MAX_AGE_SECONDS));
//@ chunk-s61vbvea.js:514374-514444 placement
/**
 * 按年龄（秒）判断缓存的促销状态是否已过期。
 */
function isPromoStale(checkedAt, n, r) {
  if (n === 0) return false;
  let s = r - checkedAt;
  return s < 0 || s >= n * 1000;
}
//@ chunk-s61vbvea.js:514444-514610 placement
var promoConfigSchema_2 = DoctorLazy(() =>
  u({
    version: E().default(0),
    endpoint: hu(isAbsolutePromoPath),
    webPath: hu(isRelativePromoPath),
    desktopPath: hu(isRelativePromoPath),
    claimLinkIncludesOrganization: M().optional(),
    statusMaxAgeSeconds: promoStatusMaxAgeSchema(),
  }),
);
//@ chunk-s61vbvea.js:514610-514690 placement
/**
 * promo 配置的校验 schema。
 */
var CLAIM_CREDIT = "claim-credit";
var promoConfigSchema = DoctorLazy(() =>
  u({
    startup: u({
      text: promoTextSchema(),
      claimPageLine: promoTextSchema(),
    }),
  }),
);
//@ chunk-s61vbvea.js:514690-514856 placement
function parsePromoConfig(featureValue_CACHED_MAY_BE_STALE) {
  let n = promoConfigSchema_2().safeParse(featureValue_CACHED_MAY_BE_STALE);
  if (!n.success) return null;
  let r = promoConfigSchema().safeParse(featureValue_CACHED_MAY_BE_STALE);
  return {
    ...n.data,
    claimPageLine: r.success ? r.data.startup.claimPageLine : null,
  };
}
//@ chunk-s61vbvea.js:514856-514928 placement
/**
 * 从 tengu_swift_lynx 开关读促销配置；没有或解析失败返回 null。
 */
function readPromoConfigFromGate() {
  let featureValue_CACHED_MAY_BE_STALE = getFeatureValue_CACHED_MAY_BE_STALE(TENGU_SWIFT_LYNX, null);
  return featureValue_CACHED_MAY_BE_STALE === null || featureValue_CACHED_MAY_BE_STALE === undefined
    ? null
    : parsePromoConfig(featureValue_CACHED_MAY_BE_STALE);
}
export {
  isRelativePromoPath,
  CLAIM_CREDIT,
  readPromoConfigFromGate,
  isPromoStale,
  isAbsolutePromoPath,
  DEFAULT_PROMO_STATUS_MAX_AGE_SECONDS,
  parsePromoState,
  promoConfigSchema_2,
  TENGU_SWIFT_LYNX,
  appendOrgIdIfUuid,
  appendPromoSubpath,
};
