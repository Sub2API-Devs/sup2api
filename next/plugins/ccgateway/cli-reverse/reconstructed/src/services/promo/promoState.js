/**
 * services/promo/promoState.ts
 *
 * 促销状态（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-7jxyna5q.js (18)
 * attribution: placement 18
 */
import { DoctorLazy } from "../../cli/handlers/util.js";
import {
  objectSchema,
  booleanSchema,
  unknown,
  stringSchema,
  numberSchema,
  custom,
} from "../../../vendor/zod/v4/classic/schemas.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../analytics/growthbook.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-7jxyna5q.js:430138-430170 placement
var ABSOLUTE_PROMO_PATH_REGEX = /^\/v1(\/[a-z0-9_-]+)+$/;
//@ chunk-7jxyna5q.js:430170-430225 placement
/**
 * 判断字符串是不是以 /v1 开头的绝对促销页面路径。
 */
function isAbsolutePromoPath(path) {
  return typeof path === "string" && ABSOLUTE_PROMO_PATH_REGEX.test(path);
}
//@ chunk-7jxyna5q.js:430225-430397 placement
var PROMO_STATES; // deferred: uses DoctorLazy (../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
var promoStatusSchema;
deferInit("chunk-7jxyna5q.js:430225", () => {
  PROMO_STATES = ["not_claimed", "pending", "active", "expired", "claimed_elsewhere"];
  promoStatusSchema = DoctorLazy(() =>
    objectSchema({
      eligible: booleanSchema().default(false),
      claimed: booleanSchema().default(false),
      state: unknown().transform(normalizePromoState).optional(),
    }),
  );
});
//@ chunk-7jxyna5q.js:430397-430465 placement
function parsePromoStatus(body) {
  let parsed = promoStatusSchema().safeParse(body);
  return parsed.success ? parsed.data : null;
}
//@ chunk-7jxyna5q.js:430465-430819 placement
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
//@ chunk-7jxyna5q.js:430819-430943 placement
function normalizePromoState(value) {
  if (typeof value !== "string") return;
  let replaced = value.toLowerCase().replace(/^[a-z_]*_state_/, "");
  return PROMO_STATES.find((state) => state === replaced);
}
//@ chunk-7jxyna5q.js:430943-430994 placement
/**
 * 匹配相对 promo 路径的正则。
 */
var TENGU_SWIFT_LYNX = "tengu_swift_lynx";
var RELATIVE_PROMO_PATH_REGEX = /^(\/[a-z0-9_-]+)+$/;
//@ chunk-7jxyna5q.js:430994-431049 placement
/**
 * 判断字符串是不是以 / 开头的相对促销页面路径。
 */
function isRelativePromoPath(path) {
  return typeof path === "string" && RELATIVE_PROMO_PATH_REGEX.test(path);
}
//@ chunk-7jxyna5q.js:431049-431120 placement
function joinPromoPath(basePath, subpath) {
  return `${basePath.endsWith("/") ? `/${basePath.slice(1, -1)}` : basePath}/${subpath}`;
}
//@ chunk-7jxyna5q.js:431120-431202 placement
/**
 * 把同一子路径同时追加到 web 与 desktop 两种促销路径上。
 */
function appendPromoSubpath(paths, subpath) {
  return {
    webPath: joinPromoPath(paths.webPath, subpath),
    desktopPath: joinPromoPath(paths.desktopPath, subpath),
  };
}
//@ chunk-7jxyna5q.js:431202-431274 placement
var UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
//@ chunk-7jxyna5q.js:431274-431369 placement
/**
 * 组织 id 是 UUID 时把它追加到促销路径后，否则返回原路径。
 */
function appendOrgIdIfUuid(basePath, orgId) {
  let normalizedOrgId = typeof orgId === "string" ? orgId.toLowerCase() : "";
  return UUID_REGEX.test(normalizedOrgId) ? `${basePath}/${normalizedOrgId}` : basePath;
}
//@ chunk-7jxyna5q.js:431369-431477 placement
var MAX_PROMO_TEXT_CHARS; // deferred: uses DoctorLazy (../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
var promoTextSchema;
var DEFAULT_PROMO_STATUS_MAX_AGE_SECONDS;
var promoStatusMaxAgeSchema;
deferInit("chunk-7jxyna5q.js:431369", () => {
  MAX_PROMO_TEXT_CHARS = 120;
  promoTextSchema = DoctorLazy(() =>
    stringSchema()
      .trim()
      .min(1)
      .max(MAX_PROMO_TEXT_CHARS)
      .regex(/^\P{Cc}*$/u),
  );
  DEFAULT_PROMO_STATUS_MAX_AGE_SECONDS = 3600;
  promoStatusMaxAgeSchema = DoctorLazy(() =>
    numberSchema().min(0).catch(DEFAULT_PROMO_STATUS_MAX_AGE_SECONDS),
  );
});
//@ chunk-7jxyna5q.js:431477-431547 placement
/**
 * 按年龄（秒）判断缓存的促销状态是否已过期。
 */
function isPromoStale(checkedAt, ttlSeconds, nowMs) {
  if (ttlSeconds === 0) return false;
  let ageMs = nowMs - checkedAt;
  return ageMs < 0 || ageMs >= ttlSeconds * 1000;
}
//@ chunk-7jxyna5q.js:431547-431713 placement
var promoConfigSchema_2; // deferred: uses DoctorLazy (../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-7jxyna5q.js:431547", () => {
  promoConfigSchema_2 = DoctorLazy(() =>
    objectSchema({
      version: numberSchema().default(0),
      endpoint: custom(isAbsolutePromoPath),
      webPath: custom(isRelativePromoPath),
      desktopPath: custom(isRelativePromoPath),
      claimLinkIncludesOrganization: booleanSchema().optional(),
      statusMaxAgeSeconds: promoStatusMaxAgeSchema(),
    }),
  );
});
//@ chunk-7jxyna5q.js:431713-431793 placement
/**
 * promo 配置的校验 schema。
 */
var CLAIM_CREDIT; // deferred: uses DoctorLazy (../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
var promoConfigSchema;
deferInit("chunk-7jxyna5q.js:431713", () => {
  CLAIM_CREDIT = "claim-credit";
  promoConfigSchema = DoctorLazy(() =>
    objectSchema({
      startup: objectSchema({
        text: promoTextSchema(),
        claimPageLine: promoTextSchema(),
      }),
    }),
  );
});
//@ chunk-7jxyna5q.js:431793-431959 placement
function parsePromoConfig(featureValue_CACHED_MAY_BE_STALE) {
  let parsed = promoConfigSchema_2().safeParse(featureValue_CACHED_MAY_BE_STALE);
  if (!parsed.success) return null;
  let pageLineParsed = promoConfigSchema().safeParse(featureValue_CACHED_MAY_BE_STALE);
  return {
    ...parsed.data,
    claimPageLine: pageLineParsed.success ? pageLineParsed.data.startup.claimPageLine : null,
  };
}
//@ chunk-7jxyna5q.js:431959-432031 placement
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
  CLAIM_CREDIT,
  readPromoConfigFromGate,
  isRelativePromoPath,
  isPromoStale,
  isAbsolutePromoPath,
  DEFAULT_PROMO_STATUS_MAX_AGE_SECONDS,
  parsePromoState,
  promoConfigSchema_2,
  TENGU_SWIFT_LYNX,
  appendOrgIdIfUuid,
  appendPromoSubpath,
};
