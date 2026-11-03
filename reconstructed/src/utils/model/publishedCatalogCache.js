/**
 * utils/model/publishedCatalogCache.ts
 *
 * 已发布模型目录缓存（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-s93zf4b4.js (28)
 * attribution: placement 28
 */
import { join } from "path";
import { DoctorLazy } from "../../cli/handlers/util.js";
import { u, literal, E, string, _enum, unknown } from "../../../vendor/zod/v4/classic/schemas.js";
import {
  isValidEtag,
  CatalogDocumentSchema,
  CATALOG_SCHEMA,
  MAX_DOCUMENT_CHARS,
  SURFACE_NAMES,
  getSelectorSurface,
  parseIsoTimestamp,
  servedCatalogActive,
} from "./modelCatalog/servedCatalog.js";
import { modelCatalogCacheDir, maskStorage, addMaskedIds } from "./modelCatalog/maskedIds.js";
import { getProviderState } from "./providerCaches.js";
import { isENOENT, getErrnoCode } from "../errors.js";
import { logForDebugging } from "../debug.js";
import { safeParseJSON } from "../json.js";
import { jsonStringify } from "../slowOperations.js";
import {
  MANAGED_MODEL_CATALOG_PUBLIC_KEY,
  isFileCatalogSource,
} from "../../services/modelCatalog/publishedCatalog.js";
import { registerPublicIds, recordMaskedFromCatalog, getMaskedIdSet } from "./modelCatalog/catalogEntries.js";
import {
  servedModelCatalogEligibility,
  catalogAuthKind,
  catalogScope,
  delegatedQuailMode,
} from "../../services/modelCatalog/servedCatalog.js";
import { isPolicyAllowed } from "../../services/policyLimits/policyEvidence.js";
import {
  getAPIProvider,
  isClaudePlatformProvider,
  isFirstPartyProvider,
  isFirstPartyApiBackend,
} from "./providers.js";
import {
  isThirdPartyBackend,
  includeUnsupportedDefault,
  thirdPartyBackends,
} from "./modelCatalog/catalogCapabilities.js";
import { isEnvTruthy } from "../envUtils.js";
import { env } from "../env.js";
import { isDiskless } from "../../bootstrap/state.js";

//@ chunk-s93zf4b4.js:788-998 placement
var CACHE_VERSION = 2;
var CATALOG_TTL_MS = 3600000;
var TTL_JITTER = 0.1;
var CATALOG_SOURCES = ["hosted", "custom_url", "file"];
var cachedCatalogSchema = DoctorLazy(() =>
  u({
    version: literal(CACHE_VERSION),
    fetchedAt: E(),
    staleAt: E(),
    etag: string().refine(isValidEtag).optional(),
    source: _enum(CATALOG_SOURCES),
    documentBytes: string(),
    sidecar: unknown(),
    rootId: string(),
    document: CatalogDocumentSchema(),
  }),
);
//@ chunk-s93zf4b4.js:998-1051 placement
/**
 * 某作用域的已发布目录缓存文件路径。
 */
function publishedCatalogCachePath(e) {
  return join(modelCatalogCacheDir(), `published-${e}.json`);
}
//@ chunk-s93zf4b4.js:1051-1098 placement
function publishedCatalogByKey() {
  return getProviderState().publishedCatalogByKey;
}
//@ chunk-s93zf4b4.js:1098-1119 placement
var MAX_CACHE_FILE_BYTES = CATALOG_SCHEMA * 3 + MAX_DOCUMENT_CHARS + 4096;
//@ chunk-s93zf4b4.js:1119-1575 placement
async function readPublishedCatalogCache(cacheKey) {
  let a = publishedCatalogByKey().get(cacheKey);
  if (a !== undefined) return a ?? undefined;
  let r = publishedCatalogCachePath(cacheKey);
  let n;
  try {
    n = await maskStorage().readRange(r, 0, MAX_CACHE_FILE_BYTES + 1);
  } catch (error) {
    if (!isENOENT(error))
      logForDebugging(`[publishedCatalog] cache read failed: ${getErrnoCode(error) ?? "unknown"}`);
    publishedCatalogByKey().set(cacheKey, null);
    return;
  }
  let s =
    n.length > MAX_CACHE_FILE_BYTES
      ? undefined
      : cachedCatalogSchema().safeParse(safeParseJSON(n.toString("utf8"), false));
  if (!s?.success) {
    logForDebugging(`[publishedCatalog] cache file ${s === undefined ? "oversized" : "invalid"}, discarding`);
    await clearPublishedCatalogCache(cacheKey);
    return;
  }
  await storePublishedCatalog(cacheKey, s.data, {
    verified: false,
  });
  return s.data;
}
//@ chunk-s93zf4b4.js:1575-1651 placement
/**
 * 清除某作用域的已发布目录缓存（内存与磁盘）。
 */
async function clearPublishedCatalogCache(e) {
  publishedCatalogByKey().set(e, null);
  try {
    await maskStorage().delete(publishedCatalogCachePath(e));
  } catch {}
}
//@ chunk-s93zf4b4.js:1651-1683 placement
/**
 * 只清内存中的缓存条目。
 */
function forgetPublishedCatalogCache(cacheKey) {
  publishedCatalogByKey().set(cacheKey, null);
}
//@ chunk-s93zf4b4.js:1683-1881 placement
async function writePublishedCatalogCache(cacheKey, a) {
  await storePublishedCatalog(cacheKey, a, {
    verified: true,
  });
  try {
    let r = maskStorage();
    await r.mkdir(modelCatalogCacheDir());
    await r.atomicWrite(publishedCatalogCachePath(cacheKey), jsonStringify(a), 384);
  } catch (error) {
    logForDebugging(`[publishedCatalog] cache write failed: ${getErrnoCode(error) ?? "unknown"}`);
  }
}
//@ chunk-s93zf4b4.js:1881-2008 placement
/**
 * 保存已发布目录缓存条目，验证过且非托管根时登记各界面，并应用目录。
 */
async function storePublishedCatalog(e, a, { verified }) {
  publishedCatalogByKey().set(e, a);
  if (verified && a.rootId !== MANAGED_MODEL_CATALOG_PUBLIC_KEY)
    for (let n of getDocumentSurfaces(a.document)) registerPublicIds(n);
  await applyPublishedCatalog(a.document);
}
//@ chunk-s93zf4b4.js:2008-2111 placement
/**
 * 应用已发布目录文档：注册各界面目录并加入遮盖 id。
 */
async function applyPublishedCatalog(e) {
  let documentSurfaces = getDocumentSurfaces(e);
  for (let documentSurface of documentSurfaces) recordMaskedFromCatalog(documentSurface);
  await addMaskedIds(
    new Set(documentSurfaces.flatMap((documentSurface) => [...getMaskedIdSet(documentSurface)])),
  );
}
//@ chunk-s93zf4b4.js:2111-2222 placement
function getDocumentSurfaces(e) {
  return SURFACE_NAMES.flatMap((a) => {
    let r = e.surfaces[a];
    let n = r === undefined ? null : getSelectorSurface(r, a);
    return n === null ? [] : [n];
  });
}
//@ chunk-s93zf4b4.js:2222-2496 placement
/**
 * 构建已发布目录缓存条目（版本、获取时间、带抖动的过期时间、原始字节与签名）。
 */
function buildCacheEntry({
  document: e,
  documentBytes,
  sidecar,
  etag,
  source,
  rootId,
  now = Date.now(),
  random = Math.random(),
}) {
  return {
    version: CACHE_VERSION,
    fetchedAt: now,
    staleAt: computeStaleAt(now, random),
    ...(etag !== undefined && {
      etag,
    }),
    source,
    documentBytes: Buffer.from(documentBytes).toString("base64"),
    sidecar,
    rootId,
    document: e,
  };
}
//@ chunk-s93zf4b4.js:2496-2581 placement
/**
 * 给缓存条目补上抓取时间与带抖动的过期时间。
 */
function withCacheTimestamps(e, a = Date.now(), r = Math.random()) {
  return {
    ...e,
    fetchedAt: a,
    staleAt: computeStaleAt(a, r),
  };
}
//@ chunk-s93zf4b4.js:2581-2640 placement
function computeStaleAt(e, a) {
  let r = 1 + TTL_JITTER * (2 * a - 1);
  return e + Math.round(CATALOG_TTL_MS * r);
}
//@ chunk-s93zf4b4.js:2640-2717 placement
/**
 * 判断目录文档本身是否已过期。
 */
function isDocumentExpired(e, a = Date.now()) {
  let isoTimestamp = parseIsoTimestamp(e.expires_at);
  return isoTimestamp !== undefined && a >= isoTimestamp;
}
//@ chunk-s93zf4b4.js:2717-2839 placement
/**
 * 判断缓存条目是否过期（时间异常、到期或文档自身过期）。
 */
function isCacheEntryStale(e, a = Date.now()) {
  let r = e.fetchedAt + CATALOG_TTL_MS * (1 + TTL_JITTER);
  return a < e.fetchedAt || a >= e.staleAt || e.staleAt > r || isDocumentExpired(e.document, a);
}
//@ chunk-s93zf4b4.js:2839-2966 placement
/**
 * 计算已发布目录的阻止原因（必要流量门可在特定情况下跳过）。
 */
function getPublishedCatalogBlock() {
  let e = servedModelCatalogEligibility();
  if (e === "essential_traffic" && isFileCatalogSource()) {
    let a = servedModelCatalogEligibility({
      skipEssentialTrafficGate: true,
    });
    return mapCatalogEligibility(a);
  }
  return mapCatalogEligibility(e);
}
//@ chunk-s93zf4b4.js:2966-3051 placement
/**
 * 判断是否为"fallback 来源且用 key 认证"的目录。
 */
function isKeyAuthFallbackSource(e) {
  return e.source === "fallback" && e.credential !== undefined && isKeyAuthKind(e.credential);
}
//@ chunk-s93zf4b4.js:3051-3092 placement
function isKeyAuthCatalogSource(e) {
  return e !== null && isKeyAuthKind(catalogAuthKind(e));
}
//@ chunk-s93zf4b4.js:3092-3192 placement
function isKeyAuthKind(e) {
  switch (e) {
    case "oauth":
      return false;
    case "api_key":
    case "profile":
    case "federation":
      return true;
  }
}
//@ chunk-s93zf4b4.js:3192-3584 placement
/**
 * 把服务端目录资格结果映射为已发布目录的阻止原因：环境关闭/bare/必要流量/socket/策略原样返回，非第一方再细分，非 claude.ai 认证看策略，无组织/账号时由服务端目录接管。
 */
function mapCatalogEligibility(e) {
  switch (e) {
    case "env_off":
    case "bare":
    case "essential_traffic":
    case "unix_socket":
    case "policy":
      return e;
    case "not_first_party":
      return getProviderCatalogBlock();
    case "not_claude_ai_auth":
    case "api_key_helper":
      return isPolicyAllowed("allow_model_catalog") ? null : "policy";
    case "no_org":
    case "no_account":
      return "served_applies";
    case null:
      if (isKeyAuthCatalogSource(catalogScope()))
        return servedCatalogActive()?.source === "served" ? "served_applies" : null;
      return "served_applies";
  }
}
//@ chunk-s93zf4b4.js:3584-3860 placement
function getProviderCatalogBlock() {
  let apiProvider = getAPIProvider();
  if (apiProvider === "gateway") return "cloud_gateway";
  let a = isClaudePlatformProvider(apiProvider);
  let r = !a && isFirstPartyProvider();
  let n = a ? "platform_flag_off" : r && !isFileCatalogSource() ? "gateway_flag_off" : null;
  if (n !== null && delegatedQuailMode("published") === "off") return n;
  if ((a || r) && !includeUnsupportedCatalogFlag()) return "release_off";
  if (isThirdPartyBackend(apiProvider) && !isModelCatalogEnvOn(apiProvider)) return "release_off";
  return null;
}
//@ chunk-s93zf4b4.js:3860-3886 placement
function includeUnsupportedCatalogFlag() {
  return includeUnsupportedDefault();
}
//@ chunk-s93zf4b4.js:3886-3958 placement
function isModelCatalogEnvOn(apiProvider) {
  return thirdPartyBackends().includes(apiProvider) || isEnvTruthy(env.CLAUDE_CODE_MODEL_CATALOG);
}
//@ chunk-s93zf4b4.js:3958-3993 placement
/**
 * 判断已发布目录是否被策略阻断。
 */
function isPublishedCatalogBlocked() {
  return getPublishedCatalogBlock() === null;
}
//@ chunk-s93zf4b4.js:3993-4052 placement
/**
 * 判断已发布目录是否可用（第一方、非无盘、策略未关）。
 */
function isPublishedCatalogUsable() {
  return isFirstPartyApiBackend() && !isDiskless() && delegatedQuailMode("published") !== "off";
}
//@ chunk-s93zf4b4.js:4052-4112 placement
/**
 * 取模型目录来源模式（published 或 primary）。
 */
function catalogSourceMode() {
  return isFirstPartyProvider() || isClaudePlatformProvider() ? delegatedQuailMode("published") : "primary";
}
//@ chunk-s93zf4b4.js:4112-4162 placement
/**
 * 取已发布目录的阻断模式判定。
 */
function publishedCatalogBlockMode() {
  if (!isPublishedCatalogBlocked()) return "off";
  return catalogSourceMode();
}
export {
  isCacheEntryStale,
  readPublishedCatalogCache,
  forgetPublishedCatalogCache,
  clearPublishedCatalogCache,
  storePublishedCatalog,
  catalogSourceMode,
  isPublishedCatalogBlocked,
  isDocumentExpired,
  withCacheTimestamps,
  writePublishedCatalogCache,
  buildCacheEntry,
  applyPublishedCatalog,
  isKeyAuthFallbackSource,
  isPublishedCatalogUsable,
  getPublishedCatalogBlock,
  publishedCatalogBlockMode,
  publishedCatalogCachePath,
};
