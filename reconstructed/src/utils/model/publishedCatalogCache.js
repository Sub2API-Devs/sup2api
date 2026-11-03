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
import { u, T, E, o, U, oe } from "../../../vendor/zod/v4/classic/schemas.js";
import {
  isValidEtag,
  CatalogDocumentSchema,
  CATALOG_SCHEMA,
  MAX_DOCUMENT_CHARS,
  Rpr,
  getSelectorSurface,
  parseIsoTimestamp,
  O3t,
} from "./modelCatalog/servedCatalog.js";
import { modelCatalogCacheDir, maskStorage, addMaskedIds } from "./modelCatalog/maskedIds.js";
import { getProviderState } from "./providerCaches.js";
import { isENOENT, getErrnoCode } from "../errors.js";
import { logForDebugging } from "../debug.js";
import { safeParseJSON } from "../json.js";
import { jsonStringify } from "../slowOperations.js";
import { MANAGED_MODEL_CATALOG_PUBLIC_KEY, XNo } from "../../services/modelCatalog/publishedCatalog.js";
import { Tpr, SCn, getMaskedIdSet } from "./modelCatalog/catalogEntries.js";
import {
  servedModelCatalogEligibility,
  catalogAuthKind,
  Toe,
  zKn,
} from "../../services/modelCatalog/servedCatalog.js";
import { isPolicyAllowed } from "../../services/policyLimits/policyEvidence.js";
import {
  getAPIProvider,
  isClaudePlatformProvider,
  isFirstPartyProvider,
  isFirstPartyApiBackend,
} from "./providers.js";
import { jat, mwi, pwi } from "./modelCatalog/catalogCapabilities.js";
import { isEnvTruthy } from "../envUtils.js";
import { env } from "../env.js";
import { isDiskless } from "../../bootstrap/state.js";

//@ chunk-s93zf4b4.js:788-998 placement
var CACHE_VERSION = 2,
  CATALOG_TTL_MS = 3600000,
  TTL_JITTER = 0.1,
  CATALOG_SOURCES = ["hosted", "custom_url", "file"],
  cachedCatalogSchema = DoctorLazy(() =>
    u({
      version: T(CACHE_VERSION),
      fetchedAt: E(),
      staleAt: E(),
      etag: o().refine(isValidEtag).optional(),
      source: U(CATALOG_SOURCES),
      documentBytes: o(),
      sidecar: oe(),
      rootId: o(),
      document: CatalogDocumentSchema(),
    }),
  );
//@ chunk-s93zf4b4.js:998-1051 placement
function Ogt(e) {
  return join(modelCatalogCacheDir(), `published-${e}.json`);
}
//@ chunk-s93zf4b4.js:1051-1098 placement
function l() {
  return getProviderState().publishedCatalogByKey;
}
//@ chunk-s93zf4b4.js:1098-1119 placement
var f = CATALOG_SCHEMA * 3 + MAX_DOCUMENT_CHARS + 4096;
//@ chunk-s93zf4b4.js:1119-1575 placement
async function readPublishedCatalogCache(e) {
  let a = l().get(e);
  if (a !== void 0) return a ?? void 0;
  let r = Ogt(e),
    n;
  try {
    n = await maskStorage().readRange(r, 0, f + 1);
  } catch (error) {
    if (!isENOENT(error))
      logForDebugging(`[publishedCatalog] cache read failed: ${getErrnoCode(error) ?? "unknown"}`);
    l().set(e, null);
    return;
  }
  let s = n.length > f ? void 0 : cachedCatalogSchema().safeParse(safeParseJSON(n.toString("utf8"), !1));
  if (!s?.success) {
    (logForDebugging(`[publishedCatalog] cache file ${s === void 0 ? "oversized" : "invalid"}, discarding`),
      await iwo(e));
    return;
  }
  return (await storePublishedCatalog(e, s.data, { verified: !1 }), s.data);
}
//@ chunk-s93zf4b4.js:1575-1651 placement
async function iwo(e) {
  l().set(e, null);
  try {
    await maskStorage().delete(Ogt(e));
  } catch {}
}
//@ chunk-s93zf4b4.js:1651-1683 placement
function fDs(e) {
  l().set(e, null);
}
//@ chunk-s93zf4b4.js:1683-1881 placement
async function writePublishedCatalogCache(e, a) {
  await storePublishedCatalog(e, a, { verified: !0 });
  try {
    let r = maskStorage();
    (await r.mkdir(modelCatalogCacheDir()), await r.atomicWrite(Ogt(e), jsonStringify(a), 384));
  } catch (error) {
    logForDebugging(`[publishedCatalog] cache write failed: ${getErrnoCode(error) ?? "unknown"}`);
  }
}
/**
 * 保存已发布目录缓存条目，验证过且非托管根时登记各界面，并应用目录。
 */
//@ chunk-s93zf4b4.js:1881-2008 placement
async function storePublishedCatalog(e, a, { verified: verified }) {
  if ((l().set(e, a), verified && a.rootId !== MANAGED_MODEL_CATALOG_PUBLIC_KEY))
    for (let n of getDocumentSurfaces(a.document)) Tpr(n);
  await applyPublishedCatalog(a.document);
}
/**
 * 应用已发布目录文档：注册各界面目录并加入遮盖 id。
 */
//@ chunk-s93zf4b4.js:2008-2111 placement
async function applyPublishedCatalog(e) {
  let a = getDocumentSurfaces(e);
  for (let r of a) SCn(r);
  await addMaskedIds(new Set(a.flatMap((r) => [...getMaskedIdSet(r)])));
}
//@ chunk-s93zf4b4.js:2111-2222 placement
function getDocumentSurfaces(e) {
  return Rpr.flatMap((a) => {
    let r = e.surfaces[a],
      n = r === void 0 ? null : getSelectorSurface(r, a);
    return n === null ? [] : [n];
  });
}
/**
 * 构建已发布目录缓存条目（版本、获取时间、带抖动的过期时间、原始字节与签名）。
 */
//@ chunk-s93zf4b4.js:2222-2496 placement
function buildCacheEntry({
  document: e,
  documentBytes: documentBytes,
  sidecar: sidecar,
  etag: etag,
  source: source,
  rootId: rootId,
  now: now = Date.now(),
  random: random = Math.random(),
}) {
  return {
    version: CACHE_VERSION,
    fetchedAt: now,
    staleAt: v(now, random),
    ...(etag !== void 0 && { etag: etag }),
    source: source,
    documentBytes: Buffer.from(documentBytes).toString("base64"),
    sidecar: sidecar,
    rootId: rootId,
    document: e,
  };
}
//@ chunk-s93zf4b4.js:2496-2581 placement
function mDs(e, a = Date.now(), r = Math.random()) {
  return { ...e, fetchedAt: a, staleAt: v(a, r) };
}
//@ chunk-s93zf4b4.js:2581-2640 placement
function v(e, a) {
  let r = 1 + TTL_JITTER * (2 * a - 1);
  return e + Math.round(CATALOG_TTL_MS * r);
}
//@ chunk-s93zf4b4.js:2640-2717 placement
function dwo(e, a = Date.now()) {
  let r = parseIsoTimestamp(e.expires_at);
  return r !== void 0 && a >= r;
}
/**
 * 判断缓存条目是否过期（时间异常、到期或文档自身过期）。
 */
//@ chunk-s93zf4b4.js:2717-2839 placement
function isCacheEntryStale(e, a = Date.now()) {
  let r = e.fetchedAt + CATALOG_TTL_MS * (1 + TTL_JITTER);
  return a < e.fetchedAt || a >= e.staleAt || e.staleAt > r || dwo(e.document, a);
}
/**
 * 计算已发布目录的阻止原因（必要流量门可在特定情况下跳过）。
 */
//@ chunk-s93zf4b4.js:2839-2966 placement
function getPublishedCatalogBlock() {
  let e = servedModelCatalogEligibility();
  if (e === "essential_traffic" && XNo()) {
    let a = servedModelCatalogEligibility({ skipEssentialTrafficGate: !0 });
    return mapCatalogEligibility(a);
  }
  return mapCatalogEligibility(e);
}
//@ chunk-s93zf4b4.js:2966-3051 placement
function vPr(e) {
  return e.source === "fallback" && e.credential !== void 0 && isKeyAuthKind(e.credential);
}
//@ chunk-s93zf4b4.js:3051-3092 placement
function x(e) {
  return e !== null && isKeyAuthKind(catalogAuthKind(e));
}
//@ chunk-s93zf4b4.js:3092-3192 placement
function isKeyAuthKind(e) {
  switch (e) {
    case "oauth":
      return !1;
    case "api_key":
    case "profile":
    case "federation":
      return !0;
  }
}
/**
 * 把服务端目录资格结果映射为已发布目录的阻止原因：环境关闭/bare/必要流量/socket/策略原样返回，非第一方再细分，非 claude.ai 认证看策略，无组织/账号时由服务端目录接管。
 */
//@ chunk-s93zf4b4.js:3192-3584 placement
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
      if (x(Toe())) return O3t()?.source === "served" ? "served_applies" : null;
      return "served_applies";
  }
}
//@ chunk-s93zf4b4.js:3584-3860 placement
function getProviderCatalogBlock() {
  let e = getAPIProvider();
  if (e === "gateway") return "cloud_gateway";
  let a = isClaudePlatformProvider(e),
    r = !a && isFirstPartyProvider(),
    n = a ? "platform_flag_off" : r && !XNo() ? "gateway_flag_off" : null;
  if (n !== null && zKn("published") === "off") return n;
  if ((a || r) && !D()) return "release_off";
  if (jat(e) && !w(e)) return "release_off";
  return null;
}
//@ chunk-s93zf4b4.js:3860-3886 placement
function D() {
  return mwi();
}
//@ chunk-s93zf4b4.js:3886-3958 placement
function w(e) {
  return pwi().includes(e) || isEnvTruthy(env.CLAUDE_CODE_MODEL_CATALOG);
}
//@ chunk-s93zf4b4.js:3958-3993 placement
function Krn() {
  return getPublishedCatalogBlock() === null;
}
//@ chunk-s93zf4b4.js:3993-4052 placement
function h1n() {
  return isFirstPartyApiBackend() && !isDiskless() && zKn("published") !== "off";
}
//@ chunk-s93zf4b4.js:4052-4112 placement
function y1n() {
  return isFirstPartyProvider() || isClaudePlatformProvider() ? zKn("published") : "primary";
}
//@ chunk-s93zf4b4.js:4112-4162 placement
function Vrn() {
  if (!Krn()) return "off";
  return y1n();
}

export {
  isCacheEntryStale,
  readPublishedCatalogCache,
  fDs,
  iwo,
  storePublishedCatalog,
  y1n,
  Krn,
  dwo,
  mDs,
  writePublishedCatalogCache,
  buildCacheEntry,
  applyPublishedCatalog,
  vPr,
  h1n,
  getPublishedCatalogBlock,
  Vrn,
  Ogt,
};
