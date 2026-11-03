/**
 * utils/model/servedModelCatalog.ts
 *
 * 2.1.316 新增：服务端下发模型目录的获取、对比与应用
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-3wek6r2k.js (32), chunk-c0w5a81j.js (76)
 * attribution: placement 108
 */
import { getClientPlatform } from "../http.js";
import { Vt } from "../agentId.js";
import {
  xpr,
  isValidEtag,
  CATALOG_SCHEMA,
  getSchemaVersion,
  CATALOG_SCHEMA_VERSION,
  CatalogDocumentSchema,
  dwi,
  O3t,
  kCn,
  isHeldForModel,
  findMissingFamilyDefault,
  Bae,
  surfaceStateFor,
  cwi,
  l6e,
  Axt,
  withCatalogSuppressed,
  servedCatalogSource,
  activeServedCatalog,
} from "./modelCatalog/servedCatalog.js";
import {
  catalogEndpointForScope,
  catalogAuthKind,
  l0r,
  GIo,
  d0r,
  isCatalogCacheStale,
  iHe,
  nZ,
  Toe,
  catalogCacheKey,
  loadCachedCatalog,
  fetchServedCatalogOnce,
  isSameCatalogScope,
  buildCatalogCacheEntry,
  saveCachedCatalog,
  Hjs,
  discardCachedCatalog,
  catalogCacheFilePath,
  catalogCredentialKind,
  servedModelCatalogEligibility,
} from "../../services/modelCatalog/servedCatalog.js";
import { maskStorage, modelCatalogCacheDir } from "./modelCatalog/maskedIds.js";
import { isENOENT, getErrnoCode } from "../errors.js";
import { logForDebugging } from "../debug.js";
import { safeParseJSON } from "../json.js";
import { jsonStringify } from "../slowOperations.js";
import { getProviderState } from "./providerCaches.js";
import {
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
} from "./publishedCatalogCache.js";
import {
  Tpr,
  activateServedCatalog,
  activateFallbackCatalog,
  setServedCatalog,
  normalizeModelId,
  getMaskedModelIds,
  CONFIDENTIAL_MODEL_ID,
  getHiddenModelIds,
  vpr,
  containsMaskedId,
  maskModelIdCached,
} from "./modelCatalog/catalogEntries.js";
import { logError } from "../log.js";
import {
  isManagedCatalogSourceUnverified,
  verifyCatalogSignature as verifyCatalogSignature_2,
  O6n,
  resolvePublishedCatalogSource,
  fetchPublishedCatalog as fetchPublishedCatalog_2,
  isUnverifiedFileCatalogSource,
} from "../../services/modelCatalog/publishedCatalog.js";
import { recordPublishedCatalogFloor, D6n } from "./modelCatalog/publishedCatalogFloor.js";
import {
  offeredCatalogRows,
  getFamilyDefault,
  Wat,
  providerModelOverrides,
  getFamilyDefaults,
  getModelCatalogStatus,
  gwi,
} from "./modelCatalog/catalogCapabilities.js";
import {
  activeCatalogModels,
  catalogModels,
  isFirstPartyApiBackend,
  providerCatalogKey,
  getAPIProvider,
  a6e,
  D3,
  getDefaultOutputTokens,
  Los,
  getDefaultEffort,
  Dos,
  YSi,
  qSi,
  QSi,
  lto,
} from "./providers.js";
import { logFeatureOk, logFeatureSad } from "../../services/analytics/featureTelemetry.js";
import { fromEnum, fromEnumOpt, lit, fromNumber } from "../../services/analytics/safeMetadata.js";
import { withTimeout, withDeadline } from "../sleep.js";
import { logForDiagnosticsNoPII } from "../diagLogs.js";
import {
  resolveCatalogAlias,
  EFFORT_CAPABILITY_KEYS,
  modelDefinitelySupports,
  getCatalogState,
} from "./modelCatalog.js";
import { getRemoteManagedSettingsSyncFromCache } from "../../services/remoteManagedSettings/remoteSettingsCache.js";
import { computeRemoteSettingsEligibility } from "../../services/cloudSessions/eligibility.js";
import {
  isRemoteManagedSettingsVerified,
  getLastLoadStatus,
  onLastLoadStatusChanged,
} from "../../services/remoteManagedSettings/remoteSettingsState.js";
import {
  isModelCapabilitiesCacheEnabled,
  loadFreshCapabilities,
  parseModelCapability,
  refreshModelCapabilities,
} from "./modelCapabilities.js";
import { isEssentialTrafficOnly } from "../privacyLevel.js";
import { isDiskless, getSdkBetas, getIsNonInteractiveSession } from "../../bootstrap/state.js";
import { Bn } from "./modelIds.js";
import { getMainLoopModel, getDefaultOpusModel, getDefaultSonnetModel } from "./model.js";
import { getAnthropicClient } from "../../services/api/client.js";
import { mainAgentContext } from "../agentContext.js";
import { isClaudeAISubscriber } from "../auth.js";
import { OAUTH_BETA_HEADER } from "../../constants/oauth.js";
import { getEnabledModelOptions } from "./modelOptions.js";
import { getCanonicalName } from "./canonicalModelName.js";
import { getModelMaxOutputTokens } from "../context.js";
import { getDefaultMainLoopModel, firstPartyNameToCanonical } from "./modelFallback.js";
import { getDefaultHaikuModel } from "./planModeModel.js";
import { getContextWindow } from "./configs.js";
import { defaultMaxOutputTokens } from "../betas.js";
import { getDefaultEffortForModel, khi, isEffortLevel } from "../effort.js";
import { sci, ici } from "./modelErrorOverrides.js";
import { count, uniq } from "../collections.js";
import { parseUserSpecifiedModel } from "./modelDisplay.js";
import { isPlainNonInteractive } from "../sessionShape.js";
import { logEvent } from "../../services/analytics/index.js";
import { telemetrySafeModelName, Bwi } from "./telemetryModelName.js";
import { settingsSourceTag, managedKeyTelemetry } from "../settings/settingsTelemetryKeys.js";

//@ chunk-c0w5a81j.js:1151-1219 placement
var Re = 5000,
  ke = ["not_permitted", "ip_restricted", "lane_unavailable"];
//@ chunk-c0w5a81j.js:1219-1260 placement
function F(e) {
  return ke.some((r) => r === e);
}
//@ chunk-c0w5a81j.js:3112-3611 placement
function fetchModelSelector(e, r) {
  switch (e.kind) {
    case "account":
      return { path: `/api/organizations/:orgUUID/model_selector/${r}`, auth: "teleport-org", headers: {} };
    case "token":
      return {
        path: `/api/model_selector/${r}`,
        auth: "claude-ai-oauth",
        headers: { "anthropic-client-platform": getClientPlatform() },
      };
    case "api_key":
      return {
        path: `/api/model_selector/${r}`,
        auth: "required",
        headers: { "anthropic-client-platform": getClientPlatform() },
      };
    case "profile":
    case "federation":
      return {
        path: `/api/model_selector/${r}`,
        auth: "async",
        headers: { "anthropic-client-platform": getClientPlatform() },
      };
  }
}
//@ chunk-c0w5a81j.js:3611-3779 placement
function parseCatalogResolution(e) {
  let r = Vt(e.organization_uuid)?.toLowerCase(),
    found = xpr.find((a) => a === e.resolution);
  return { ...(r !== void 0 && { organizationUuid: r }), ...(found !== void 0 && { resolution: found }) };
}
//@ chunk-c0w5a81j.js:3779-3857 placement
function formatResolutionSuffix(e) {
  return e.resolution === void 0 ? "" : ` (resolution ${e.resolution})`;
}
//@ chunk-c0w5a81j.js:3857-4033 placement
var CREDENTIAL_SCOPE_CODES = ["oauth_scope_insufficient", "oauth_token_narrowed"],
  IP_NOT_IN_ALLOWED_RANGE = "ip_not_in_allowed_range",
  LANE_UNAVAILABLE_CODES = ["not_found", "account_session_invalid", "organization_not_visible"],
  KNOWN_REFUSAL_CODES = [...CREDENTIAL_SCOPE_CODES, IP_NOT_IN_ALLOWED_RANGE, ...LANE_UNAVAILABLE_CODES];
//@ chunk-c0w5a81j.js:4033-4088 placement
function oe(e, r) {
  let o = getErrorCode(r);
  return e.find((a) => a === o);
}
//@ chunk-c0w5a81j.js:4088-4141 placement
function Z(e, r, o) {
  return matchScopeRefusal(r, o) ?? matchIpRefusal(r, o) ?? matchLaneRefusal(e, r, o);
}
/**
 * 生成服务端目录拒绝的后缀说明（错误码与原因）。
 */
//@ chunk-c0w5a81j.js:4141-4263 placement
function formatRefusalSuffix(e) {
  if (e === void 0 || !F(e.reason)) return "";
  return `${e.errorCode !== void 0 ? ` ${e.errorCode}` : ""} (${describeRefusalReason(e.reason)})`;
}
//@ chunk-c0w5a81j.js:4263-4535 placement
function describeRefusalReason(e) {
  switch (e) {
    case "not_permitted":
      return "this credential cannot read the served list";
    case "ip_restricted":
      return "the organization's IP allowlist refuses this network";
    case "lane_unavailable":
      return "the server has not enabled the org-less route for this session";
  }
}
//@ chunk-c0w5a81j.js:4535-4668 placement
function matchScopeRefusal(e, r) {
  let o = oe(CREDENTIAL_SCOPE_CODES, r);
  if (e === 403 && o !== void 0)
    return { status: "error", reason: "not_permitted", httpStatus: e, errorCode: o };
  return;
}
//@ chunk-c0w5a81j.js:4668-4785 placement
function matchIpRefusal(e, r) {
  if (e === 403 && getErrorCode(r) === IP_NOT_IN_ALLOWED_RANGE)
    return { status: "error", reason: "ip_restricted", httpStatus: e, errorCode: IP_NOT_IN_ALLOWED_RANGE };
  return;
}
//@ chunk-c0w5a81j.js:4785-5058 placement
function matchLaneRefusal(e, r, o) {
  if (catalogEndpointForScope(e) !== "orgless") return;
  let a = oe(LANE_UNAVAILABLE_CODES, o);
  if (
    r === 404 ||
    (r === 403 && a === "account_session_invalid") ||
    (r === 401 && a === "organization_not_visible" && catalogAuthKind(e) === "profile")
  )
    return {
      status: "error",
      reason: "lane_unavailable",
      httpStatus: r,
      ...(a !== void 0 && { errorCode: a }),
    };
  return;
}
//@ chunk-c0w5a81j.js:5058-5173 placement
function getErrorCode(e) {
  let r = T(e, "error"),
    o = T(T(r, "details"), "error_code");
  return typeof o === "string" && o.length > 0 ? o : void 0;
}
//@ chunk-c0w5a81j.js:5173-5246 placement
function T(e, r) {
  return typeof e === "object" && e !== null && r in e ? e[r] : void 0;
}
//@ chunk-c0w5a81j.js:5246-5294 placement
function $e(e) {
  return T(T(e, "response"), "data");
}
//@ chunk-c0w5a81j.js:5294-5345 placement
function xe(e) {
  let r = e?.etag;
  return isValidEtag(r) ? r : void 0;
}
//@ chunk-c0w5a81j.js:5345-5380 placement
var De = 30000,
  ne = l0r,
  Ie = 2000,
  Le = 256;
//@ chunk-c0w5a81j.js:5380-5451 placement
function se(e) {
  return `${e.replace(/\.json$/, "")}.headless-failed.json`;
}
//@ chunk-c0w5a81j.js:5451-5502 placement
function ie(e, r = Math.random()) {
  return GIo(ue(e), r);
}
//@ chunk-c0w5a81j.js:5502-5561 placement
function ue(e) {
  return Math.min(De * 2 ** (Math.max(1, e) - 1), ne);
}
//@ chunk-c0w5a81j.js:5561-5597 placement
function Ue(e) {
  return ue(e) * (1 + d0r);
}
//@ chunk-c0w5a81j.js:5597-5740 placement
async function isRetryDue(e, r = Date.now(), o = Math.random()) {
  let a = await readRetryMarker(e);
  if (a === void 0 || a.failedAt > r) return !0;
  return r - a.failedAt >= ie(a.failures, o);
}
//@ chunk-c0w5a81j.js:5740-5893 placement
async function isInRetryBackoff(e, r = Date.now(), o = Math.random()) {
  let a = await readRetryMarker(e);
  if (a === void 0 || a.failedAt > r) return !1;
  return a.timedOut || r - a.failedAt < ie(a.failures, o);
}
/**
 * 读取无头模式下服务端目录获取的重试标记文件（大小有上限），解析出失败时间、连续失败次数与是否超时；不存在或格式不对返回 undefined。
 */
//@ chunk-c0w5a81j.js:5893-6385 placement
async function readRetryMarker(e) {
  let r;
  try {
    r = (await maskStorage().readRange(se(e), 0, Le)).toString("utf8");
  } catch (error) {
    if (!isENOENT(error))
      logForDebugging(
        `[servedCatalog] headless retry marker read failed: ${getErrnoCode(error) ?? "unknown"}`,
      );
    return;
  }
  let o = safeParseJSON(r, !1);
  if (typeof o !== "object" || o === null) return;
  let a = "failedAt" in o ? o.failedAt : void 0;
  if (typeof a !== "number" || !Number.isFinite(a)) return;
  let n = "failures" in o ? o.failures : void 0;
  return {
    failedAt: a,
    failures: typeof n === "number" && Number.isSafeInteger(n) && n >= 1 ? n : 1,
    timedOut: "timedOut" in o && o.timedOut === !0,
  };
}
//@ chunk-c0w5a81j.js:6385-6455 placement
function Be(e, r) {
  return e.failedAt <= r && r - e.failedAt < Ue(e.failures) + ne;
}
/**
 * 写入或清除重试标记：clear 删除文件；back_off 在上次失败基础上累加失败次数，retry_soon 重置为 1；以 0600 权限原子写入。
 */
//@ chunk-c0w5a81j.js:6455-6823 placement
async function writeRetryMarker(e, r, o = Date.now(), a = !1) {
  let n = maskStorage(),
    s = se(e);
  try {
    if (r === "clear") {
      await n.delete(s);
      return;
    }
    let i = r === "back_off" ? await readRetryMarker(e) : void 0,
      d = { failedAt: o, failures: i !== void 0 && Be(i, o) ? i.failures + 1 : 1, ...(a && { timedOut: a }) };
    (await n.mkdir(modelCatalogCacheDir()), await n.atomicWrite(s, jsonStringify(d), 384));
  } catch (error) {
    if (!isENOENT(error))
      logForDebugging(
        `[servedCatalog] headless retry marker write failed: ${getErrnoCode(error) ?? "unknown"}`,
      );
  }
}
/**
 * 服务端目录刷新结束后（每次只处理一次）按结果更新重试标记：错误/跳过时退避或尽快重试，成功时若缓存已过期则退避否则清除。
 */
//@ chunk-c0w5a81j.js:6823-7136 placement
async function settleServedRefresh(e, r) {
  let servedCatalogSettledRefreshes = getProviderState().servedCatalogSettledRefreshes;
  if (servedCatalogSettledRefreshes.has(r)) return;
  switch ((servedCatalogSettledRefreshes.add(r), r.fetchStatus)) {
    case "error":
    case "skipped":
      await writeRetryMarker(e, He(r) ? "retry_soon" : "back_off");
      return;
    case "ok":
    case "empty":
    case "not_modified":
      await writeRetryMarker(e, r.entry === void 0 || isCatalogCacheStale(r.entry) ? "back_off" : "clear");
      return;
    default:
      return;
  }
}
//@ chunk-c0w5a81j.js:7136-7219 placement
function He(e) {
  return e.prior === void 0 && e.fetchStatus === "error" && !F(e.fetchReason);
}
/**
 * 已发布目录刷新结束后按结果更新重试标记（超时或耗时过长时标记 timedOut）：错误/拒绝时退避，成功时视缓存是否过期退避或清除。
 */
//@ chunk-c0w5a81j.js:7219-7531 placement
async function settlePublishedRefresh(e, r, o = j(r)) {
  if (!o) return;
  let a = r.fetchReason === "timeout" || (r.fetchMs ?? 0) >= Ie;
  switch (r.fetchStatus) {
    case "error":
    case "rejected":
      await writeRetryMarker(e, "back_off", Date.now(), a);
      return;
    case "ok":
    case "not_modified":
      await writeRetryMarker(
        e,
        r.entry === void 0 || isCacheEntryStale(r.entry) ? "back_off" : "clear",
        Date.now(),
        a,
      );
      return;
    default:
      return;
  }
}
//@ chunk-c0w5a81j.js:7531-7629 placement
function j(e) {
  let publishedCatalogSettledRefreshes = getProviderState().publishedCatalogSettledRefreshes;
  if (publishedCatalogSettledRefreshes.has(e)) return !1;
  return (publishedCatalogSettledRefreshes.add(e), !0);
}
/**
 * 按（作用域, 入口）合并并发的服务端目录刷新请求；目录关闭或无作用域时直接返回 off 结果。
 */
//@ chunk-c0w5a81j.js:7629-7970 placement
function refreshServedCatalogOnce({ allowNetwork: allowNetwork }) {
  let r = iHe(),
    o = nZ(),
    a = Toe();
  if (r === "off" || a === null)
    return Promise.resolve({ mode: "off", surface: o, fetchStatus: "off", entry: void 0, prior: void 0 });
  let servedCatalogRefreshes = getProviderState().servedCatalogRefreshes,
    s = catalogCacheKey(a, o),
    i = servedCatalogRefreshes.get(s);
  if (i) return i;
  let d = refreshServedCatalog({ mode: r, surface: o, scope: a, allowNetwork: allowNetwork }).finally(() => {
    servedCatalogRefreshes.delete(s);
  });
  return (servedCatalogRefreshes.set(s, d), d);
}
//@ chunk-c0w5a81j.js:7970-9657 placement
async function refreshServedCatalog({
  mode: mode,
  surface: surface,
  scope: scope,
  allowNetwork: allowNetwork,
}) {
  let n,
    s,
    i = catalogEndpointForScope(scope),
    d = catalogAuthKind(scope),
    h = (S) => ({
      mode: mode,
      surface: surface,
      route: i,
      credential: d,
      ...(S?.resolution !== void 0 && { resolution: S.resolution }),
      prior: n,
      ...(s !== void 0 && { fetchMs: s }),
    }),
    u = () => h(n);
  try {
    if (((n = await loadCachedCatalog(scope, surface)), n && !isCatalogCacheStale(n)))
      return { ...u(), fetchStatus: "cache_fresh", entry: n };
    if (!allowNetwork) return { ...u(), fetchStatus: "cache_only", entry: n };
    let servedCatalogRefusal = getProviderState().servedCatalogRefusal;
    if (servedCatalogRefusal !== void 0)
      return { ...u(), fetchStatus: "cache_only", fetchReason: servedCatalogRefusal, entry: n };
    let startTime = performance.now(),
      m = await fetchServedCatalogOnce(scope, surface, { etag: n?.etag });
    if (((s = Math.round(performance.now() - startTime)), !isSameCatalogScope(Toe(), scope)))
      return (
        logForDebugging("[servedCatalog] scope changed during fetch; answer dropped"),
        { ...u(), fetchStatus: "error", fetchReason: "scope_changed", entry: void 0 }
      );
    switch (m.status) {
      case "ok":
      case "empty": {
        let p = buildCatalogCacheEntry({
          catalog: m.status === "ok" ? m.catalog : null,
          etag: m.etag,
          organizationUuid: m.organizationUuid,
          resolution: m.resolution,
        });
        if ((await saveCachedCatalog(scope, surface, p), m.status === "ok")) Tpr(m.catalog);
        return {
          ...u(),
          resolution: m.resolution,
          fetchStatus: m.status,
          httpStatus: m.httpStatus,
          entry: p,
        };
      }
      case "not_modified": {
        let p = n ? Hjs(n) : void 0;
        if (p) await saveCachedCatalog(scope, surface, p);
        return { ...u(), fetchStatus: "not_modified", httpStatus: m.httpStatus, entry: p };
      }
      case "skipped":
        return { ...u(), fetchStatus: "skipped", fetchReason: m.reason, entry: n };
      case "error": {
        if (F(m.reason)) getProviderState().servedCatalogRefusal = m.reason;
        let p = n;
        if (m.reason === "lane_unavailable" && n !== void 0)
          (logForDebugging("[servedCatalog] org-less route not enabled; cached entry discarded"),
            await discardCachedCatalog(scope, surface),
            (p = void 0));
        return {
          ...h(p),
          fetchStatus: "error",
          fetchReason: m.reason,
          httpStatus: m.httpStatus,
          ...(m.errorCode !== void 0 && { errorCode: m.errorCode }),
          entry: p,
        };
      }
    }
  } catch (error) {
    return (logError(error), { ...u(), fetchStatus: "error", fetchReason: "exception", entry: n });
  }
}
//@ chunk-c0w5a81j.js:9657-10216 placement
async function checkCatalogKey(e) {
  if (e.trust.kind === "untrusted") return;
  let r = await readPublishedCatalogCache(e.cacheKey);
  if (r === void 0) return;
  let o = await verifySignedDocument(r, e);
  if (!o.ok) {
    if (o.reason === "unknown_key" && e.kind !== "hosted" && isManagedCatalogSourceUnverified()) {
      (logForDebugging(
        "[publishedCatalog] cached document names a key this session does not hold while server-managed settings are unconfirmed; not using it this session, keeping the file",
      ),
        fDs(e.cacheKey));
      return;
    }
    (logForDebugging(`[publishedCatalog] cached document not re-established (${o.reason}); discarding`),
      await iwo(e.cacheKey));
    return;
  }
  let entry = o.entry;
  return (await storePublishedCatalog(e.cacheKey, entry, { verified: !0 }), entry);
}
//@ chunk-c0w5a81j.js:10216-10739 placement
async function verifySignedDocument(e, r) {
  let trust = r.trust;
  if (trust.kind === "untrusted") return { ok: !1, reason: "untrusted_source" };
  let a = base64URLEncode(e.documentBytes);
  if (a === void 0) return { ok: !1, reason: "undecodable_bytes" };
  let n = await verifyCatalogSignature_2({ documentBytes: a, sidecar: e.sidecar, roots: trust.roots });
  if (!n.ok) return { ok: !1, reason: n.reason };
  let s = parseCatalogDocument(a);
  if (s === void 0) return { ok: !1, reason: "unparseable_document" };
  let i = await checkVersionRollback(s, r, void 0, n.rootId);
  if (i !== void 0) return { ok: !1, reason: i };
  return (
    await recordPublishedCatalogFloor(r.cacheKey, s),
    { ok: !0, entry: { ...e, document: s, rootId: n.rootId, source: r.kind } }
  );
}
//@ chunk-c0w5a81j.js:10739-10877 placement = base64URLEncode (1)
function base64URLEncode(buffer) {
  let buffer_2 = Buffer.from(buffer, "base64");
  if (buffer_2.toString("base64") !== buffer) return;
  return buffer_2.length > 0 && buffer_2.length <= CATALOG_SCHEMA ? new Uint8Array(buffer_2) : void 0;
}
//@ chunk-c0w5a81j.js:10877-11016 placement
function parseCatalogDocument(e) {
  let r = safeParseJSON(Buffer.from(e).toString("utf8"), !1);
  if (getSchemaVersion(r) !== CATALOG_SCHEMA_VERSION) return;
  let safeParse = CatalogDocumentSchema().safeParse(r);
  return safeParse.success ? safeParse.data : void 0;
}
//@ chunk-c0w5a81j.js:11016-11136 placement
function getMinAcceptedVersion(e, r, o) {
  let a = e.kind === "hosted" || O6n(o) === "compiled_roots";
  return Math.max(r?.document.version ?? 0, a ? dwi() : 0);
}
//@ chunk-c0w5a81j.js:11136-11285 placement
async function checkVersionRollback(e, r, o, a) {
  if (e.version < getMinAcceptedVersion(r, o, a)) return "replayed_version";
  if (e.version < (await D6n(r.cacheKey))) return "catalog_version_rollback";
  return;
}
/**
 * 按缓存键合并并发的已发布目录刷新请求；功能未开启返回 off，来源 URL 无效返回 invalid_url。
 */
//@ chunk-c0w5a81j.js:11285-11736 placement
function refreshPublishedCatalogOnce({ allowNetwork: allowNetwork }) {
  let r = y1n();
  if (!Krn())
    return Promise.resolve({ mode: r, source: void 0, fetchStatus: "off", expired: !1, entry: void 0 });
  let o = resolvePublishedCatalogSource();
  if (!o.ok)
    return Promise.resolve({
      mode: r,
      source: void 0,
      fetchStatus: "invalid_url",
      expired: !1,
      entry: void 0,
    });
  let { source: source } = o,
    publishedCatalogRefreshes = getProviderState().publishedCatalogRefreshes,
    s = publishedCatalogRefreshes.get(source.cacheKey);
  if (s) return s;
  let i = fetchPublishedCatalog({ mode: r, source: source, allowNetwork: allowNetwork }).finally(() => {
    publishedCatalogRefreshes.delete(source.cacheKey);
  });
  return (publishedCatalogRefreshes.set(source.cacheKey, i), i);
}
//@ chunk-c0w5a81j.js:11736-13459 placement
async function fetchPublishedCatalog({ mode: mode, source: source, allowNetwork: allowNetwork }) {
  let a,
    n = () => ({ mode: mode, source: source, ...(a !== void 0 && { fetchMs: a }) }),
    s,
    i = (d) => d !== void 0 && dwo(d.document);
  try {
    if (source.trust.kind === "untrusted")
      return (
        logForDebugging(`[publishedCatalog] ${source.kind} source skipped: ${source.trust.reason}`),
        { ...n(), fetchStatus: "skipped", fetchReason: source.trust.reason, expired: !1, entry: void 0 }
      );
    if (((s = await checkCatalogKey(source)), s && !isCacheEntryStale(s)))
      return { ...n(), fetchStatus: "cache_fresh", expired: !1, entry: s };
    if (s && i(s)) logForDebugging("[publishedCatalog] cached document is past its expires_at; refreshing");
    if (!allowNetwork && source.kind !== "file")
      return { ...n(), fetchStatus: "cache_only", expired: i(s), entry: s };
    let startTime = performance.now(),
      h = await fetchPublishedCatalog_2(source, { etag: s?.etag });
    if (source.kind !== "file") a = Math.round(performance.now() - startTime);
    switch (h.status) {
      case "not_modified": {
        let u = s ? mDs(s) : void 0;
        if (u) await writePublishedCatalogCache(source.cacheKey, u);
        return { ...n(), fetchStatus: "not_modified", httpStatus: h.httpStatus, expired: i(u), entry: u };
      }
      case "error":
        return {
          ...n(),
          fetchStatus: "error",
          fetchReason: h.reason,
          httpStatus: h.httpStatus,
          expired: i(s),
          entry: s,
        };
      case "ok": {
        let u = await verifyCatalogSignature({ source: source, cached: s, result: h });
        if (!u.ok)
          return (
            logForDebugging(
              `[publishedCatalog] document rejected: ${u.reason}; keeping ${s ? "last good document" : "nothing"}`,
            ),
            {
              ...n(),
              fetchStatus: "rejected",
              fetchReason: u.reason,
              httpStatus: h.httpStatus,
              expired: i(s),
              entry: s,
            }
          );
        let S = buildCacheEntry({
          document: u.document,
          documentBytes: h.documentBytes,
          sidecar: h.sidecar,
          etag: h.etag,
          source: source.kind,
          rootId: u.rootId,
        });
        await writePublishedCatalogCache(source.cacheKey, S);
        let v = i(S);
        return (
          logForDebugging(
            `[publishedCatalog] accepted ${source.kind} document v${u.document.version} (verified by ${u.rootId})${v ? ", past its expires_at" : ""}`,
          ),
          { ...n(), fetchStatus: "ok", httpStatus: h.httpStatus, expired: v, entry: S }
        );
      }
    }
  } catch (error) {
    return (
      logError(error),
      { ...n(), fetchStatus: "error", fetchReason: "exception", expired: i(s), entry: s }
    );
  }
}
//@ chunk-c0w5a81j.js:13459-14148 placement
async function verifyCatalogSignature({ source: source, cached: cached, result: o }) {
  let trust = source.trust;
  if (trust.kind === "untrusted") return { ok: !1, reason: "unsigned" };
  if (!o.hasSidecar) return { ok: !1, reason: "unsigned" };
  let n = await verifyCatalogSignature_2({
    documentBytes: o.documentBytes,
    sidecar: o.sidecar,
    roots: trust.roots,
  });
  if (!n.ok) return { ok: !1, reason: n.reason };
  let s = safeParseJSON(Buffer.from(o.documentBytes).toString("utf8"), !1),
    i = getSchemaVersion(s);
  if (i === void 0) return { ok: !1, reason: "parse_failed" };
  if (i !== CATALOG_SCHEMA_VERSION) return { ok: !1, reason: "unsupported_schema" };
  let safeParse = CatalogDocumentSchema().safeParse(s);
  if (!safeParse.success) return { ok: !1, reason: "parse_failed" };
  let h = safeParse.data,
    u = await checkVersionRollback(h, source, cached, n.rootId);
  if (u !== void 0) return (await applyPublishedCatalog(h), { ok: !1, reason: u });
  return (await recordPublishedCatalogFloor(source.cacheKey, h), { ok: !0, document: h, rootId: n.rootId });
}
//@ chunk-c0w5a81j.js:14148-14176 placement
var qe = 1750,
  Ye = 1500,
  Je = 4500;
//@ chunk-c0w5a81j.js:14176-14232 placement
function Xe(e) {
  if (nZ() === "ccr") return Je;
  return e ? Ye : qe;
}
//@ chunk-c0w5a81j.js:14232-14244 placement
var Qe = 2000;
//@ chunk-c0w5a81j.js:14244-16511 placement
async function loadCatalogCache({ headless: headless }) {
  if (getProviderState().servedCatalogActive !== void 0) return;
  try {
    if (iHe() !== "primary" || Ze()) {
      et(headless);
      return;
    }
    let r = Toe();
    if (r === null) {
      applyCompiledFallback("no_scope", "no cache scope");
      return;
    }
    let o = nZ(),
      a = await loadCachedCatalog(r, o),
      n = "cache",
      s,
      i = {},
      d,
      h = !1,
      u;
    if (a === void 0) {
      let C = headless ? catalogCacheFilePath(r, o) : null;
      if (C !== null && !(await isRetryDue(C))) h = !0;
      else {
        let R = refreshServedCatalogOnce({ allowNetwork: !0 });
        if (C !== null) R = R.then(async (A) => (await settleServedRefresh(C, A), A));
        let P = await awaitServedRefresh(R, {
          wait: "first_fetch",
          headless: headless,
          budgetMs: Xe(headless),
          scope: r,
        });
        ((d = P.timing),
          (u = P.outcome),
          (a = P.outcome?.entry),
          (s = P.outcome === void 0 ? "timeout" : P.outcome.fetchStatus),
          (i = getFetchFields(P.outcome)),
          (n = `fetch:${s}`));
      }
    } else if (!headless && isCatalogCacheStale(a)) {
      let C = await awaitServedRefresh(refreshServedCatalogOnce({ allowNetwork: !0 }), {
        wait: "stale_refresh",
        headless: headless,
        budgetMs: Qe,
        scope: r,
      });
      if (
        ((d = C.timing),
        (u = C.outcome),
        (s = C.outcome === void 0 ? "timeout" : C.outcome.fetchStatus),
        C.outcome?.fetchReason === "lane_unavailable")
      )
        a = void 0;
      else
        ((a = C.outcome?.entry ?? a),
          (n = `stale cache: waited ${d.wait_ms}ms for refresh \u2192 ${isCatalogCacheStale(a) ? "kept stale" : "refreshed"} (fetch:${s})`));
    }
    if (getProviderState().servedCatalogActive !== void 0 || !isSameCatalogScope(Toe(), r)) return;
    let S = a?.catalog ?? null,
      v = a?.resolution ?? u?.resolution,
      m = getRouteFields(r, v);
    if (S === null) {
      if (a !== void 0)
        applyCompiledFallback("surface_not_served", "server serves this surface no rows", { ...m, ...d }, r);
      else if (h)
        applyCompiledFallback(
          "headless_held_off",
          "nothing cached, and a recent headless request failed, so this run does not ask again",
          m,
          r,
        );
      else if (u !== void 0 && ot(u))
        applyRefusalFallback(u, { headless: headless, timing: d, lane: m, scope: r });
      else
        applyCompiledFallback(
          `${headless ? "headless_" : ""}fetch_${s ?? "none"}`,
          `nothing cached, ${n} produced no rows`,
          { ...m, ...i, ...d },
          r,
        );
      return;
    }
    if (offeredCatalogRows(S).length === 0) {
      applyCompiledFallback(
        activeCatalogModels(S).length === 0 ? "no_selectable_rows" : "no_offered_rows",
        `served rows hold no model this build offers (${catalogModels(S).length} rows via ${n})`,
        { ...m, ...d },
        r,
      );
      return;
    }
    let p = a !== void 0 && isCatalogCacheStale(a);
    (activateServedCatalog(S, a?.fetchedAt, p, {
      route: catalogEndpointForScope(r),
      credential: catalogAuthKind(r),
      organizationUuid: a?.organizationUuid,
      resolution: a?.resolution,
    }),
      logFeatureOk("model_catalog_primary", { decision: fromEnum("served"), ...m, ...d }),
      logForDebugging(
        `[servedCatalog] primary: using served rows (${catalogModels(S).length} rows via ${n} over the ${catalogEndpointForScope(r)} route${describeCredentialKind(catalogAuthKind(r))}, fetched ${Math.max(0, Math.round((Date.now() - (a?.fetchedAt ?? Date.now())) / 1000))}s ago${p ? ", stale" : ""}); the served list replaces the compiled picker for this session`,
      ));
  } catch (error) {
    if ((logError(error), getProviderState().servedCatalogActive === void 0 && iHe() === "primary"))
      applyCompiledFallback("exception", "exception");
  }
}
//@ chunk-c0w5a81j.js:16511-16533 placement
async function dDs() {}
//@ chunk-c0w5a81j.js:16533-16556 placement
function Ze() {
  return !1;
}
//@ chunk-c0w5a81j.js:16556-16572 placement
function et(e) {}
//@ chunk-c0w5a81j.js:16572-16699 placement
function getFetchFields(e) {
  let r = fromEnumOpt(e?.fetchReason),
    o = e?.httpStatus;
  return { ...(r !== void 0 && { fetch_reason: r }), ...(o !== void 0 && { http_status: o }) };
}
//@ chunk-c0w5a81j.js:16699-16835 placement
function getRouteFields(e, r) {
  let o = catalogEndpointForScope(e);
  return {
    route: fromEnum(o),
    credential: fromEnum(catalogAuthKind(e)),
    auth_kind: fromEnum(catalogCredentialKind()),
    ...(o === "orgless" && { resolution: fromEnum(r ?? "unknown") }),
  };
}
//@ chunk-c0w5a81j.js:16835-17027 placement
function describeCredentialKind(e) {
  switch (e) {
    case "oauth":
      return "";
    case "api_key":
      return " with the API key";
    case "profile":
      return " with the Console profile";
    case "federation":
      return " with the federation credential";
  }
}
//@ chunk-c0w5a81j.js:17027-17081 placement
function me(e) {
  return { route: catalogEndpointForScope(e), credential: catalogAuthKind(e) };
}
/**
 * 在预算时间内等待服务端目录刷新，超时则让刷新在后台继续并在结束时记录；记录等待诊断并返回结果与计时字段。
 */
//@ chunk-c0w5a81j.js:17081-17607 placement
async function awaitServedRefresh(refresh, options) {
  let { budgetMs: budgetMs } = options,
    startTime = performance.now(),
    outcome = await withTimeout(refresh, budgetMs, `served catalog ${options.wait}`).catch(() => {
      return;
    });
  if (outcome === void 0) refresh.then((i) => logLateFetch(i, options)).catch((i) => logError(i));
  let fetchMs = outcome?.fetchMs;
  return (
    logForDiagnosticsNoPII(outcome === void 0 ? "warn" : "info", "model_catalog_refresh_wait", {
      budget_ms: budgetMs,
      waited_ms: Math.round(performance.now() - startTime),
      timed_out: outcome === void 0,
      first_fetch: options.wait === "first_fetch",
    }),
    {
      outcome: outcome,
      timing: {
        wait_ms: Math.round(performance.now() - startTime),
        wait_budget_ms: budgetMs,
        wait_timed_out: outcome === void 0,
        ...(fetchMs !== void 0 && { fetch_ms: fetchMs }),
        startup_ms: Math.round(startTime),
      },
    }
  );
}
/**
 * 记录等待超时后才完成的目录获取：状态、耗时、路由字段与是否写入缓存，失败记为 sad、成功记为 ok。
 */
//@ chunk-c0w5a81j.js:17607-18174 placement
function logLateFetch(e, { wait: wait, headless: headless, budgetMs: budgetMs, scope: scope }) {
  let failed = e.fetchStatus === "error" || e.fetchStatus === "skipped",
    fields = {
      wait: fromEnum(wait),
      headless: headless,
      wait_budget_ms: budgetMs,
      ...getRouteFields(scope, e.resolution),
      ...(e.fetchMs !== void 0 && { fetch_ms: e.fetchMs }),
      fetch_status: fromEnum(e.fetchStatus),
      ...getFetchFields(e),
      cache_written:
        !failed && e.fetchStatus !== "cache_fresh" && e.fetchStatus !== "cache_only" && e.entry !== void 0,
    };
  if (failed) logFeatureSad("model_catalog_late_fetch", `fetch_${e.fetchStatus}`, fields);
  else logFeatureOk("model_catalog_late_fetch", fields);
  logForDebugging(
    `[servedCatalog] ${wait} settled after its ${budgetMs}ms wait: fetch:${e.fetchStatus}, request took ${e.fetchMs ?? "?"}ms`,
  );
}
//@ chunk-c0w5a81j.js:18174-18213 placement
function ot(e) {
  return F(e.fetchReason);
}
//@ chunk-c0w5a81j.js:18213-18321 placement
var REFUSAL_OFF_REASONS = {
  not_permitted: "credential_scope",
  ip_restricted: "ip_restricted",
  lane_unavailable: "lane_unavailable",
};
/**
 * 服务端目录因凭据范围/IP 限制/通道不可用被拒时，切换到回退目录并记录 model_catalog_primary（off 原因、HTTP 状态、拒绝码与计时）。
 */
//@ chunk-c0w5a81j.js:18321-18791 placement
function applyRefusalFallback(e, { headless: headless, timing: timing, lane: lane, scope: scope }) {
  let s = REFUSAL_OFF_REASONS[e.fetchReason];
  (activateFallbackCatalog(s, me(scope)),
    logFeatureOk("model_catalog_primary", {
      decision: fromEnum("off"),
      off_reason: fromEnum(s),
      ...pe(s),
      headless: headless,
      ...lane,
      ...(e.httpStatus !== void 0 && { http_status: e.httpStatus }),
      ...(e.errorCode !== void 0 && { refusal_code: fromEnum(e.errorCode) }),
      ...timing,
    }));
  let i = `${e.httpStatus ?? "?"}${e.errorCode !== void 0 ? ` ${e.errorCode}` : ""}`;
  logForDebugging(
    `[servedCatalog] primary: served rows unavailable (${describeRefusalReason(e.fetchReason)}: ${i}); using compiled behavior`,
  );
}
//@ chunk-c0w5a81j.js:18791-19010 placement
function applyCompiledFallback(e, r, o, a, n) {
  (activateFallbackCatalog(e, { ...(a !== void 0 && me(a)), ...(n !== void 0 && { organizationUuid: n }) }),
    logFeatureSad("model_catalog_primary", e, { ...pe(e), ...o }),
    logForDebugging(`[servedCatalog] primary: served rows unavailable (${r}); using compiled behavior`));
}
//@ chunk-c0w5a81j.js:19010-19034 placement
function pe(e) {
  return {};
}
//@ chunk-c0w5a81j.js:19034-19053 placement
var q = 2000,
  it = 1500;
/**
 * 选择主模型目录来源：已发布目录或编译内置行为（非必要流量关闭时跳过）
 */
//@ chunk-c0w5a81j.js:19053-22570 placement
async function resolvePrimaryCatalog({ headless: headless }) {
  let r = {};
  try {
    let o = O3t();
    if (o !== void 0 && !vPr(o)) return;
    let a = !headless || h1n(),
      n = a && isFirstPartyApiBackend(),
      s = !n ? 0 : headless ? it : q,
      i = Date.now() + s,
      d = ft() && y1n() === "primary" && (await waitForRemoteSettings(i)),
      h = getPublishedCatalogBlock();
    if (h !== null) {
      if (d && h === "essential_traffic")
        (logFeatureSad("model_catalog_published", "essential_traffic", buildDecisionFields(headless, r, d)),
          logForDebugging(
            "[publishedCatalog] primary: nonessential traffic is disabled and the server-managed catalog source is not yet confirmed by the server; published path off this session",
          ));
      return;
    }
    let u = Vrn(),
      S = resolvePublishedCatalogSource();
    if (!S.ok) {
      if (u === "primary")
        applyPublishedFallback(
          S.reason,
          "configured catalog URL is unusable",
          buildDecisionFields(headless, r, d),
        );
      return;
    }
    let { source: source } = S;
    if (source.trust.kind === "untrusted") {
      if (u === "primary")
        applyPublishedFallback(
          source.trust.reason,
          `custom source is untrusted (${source.trust.reason})`,
          buildDecisionFields(headless, r, d),
        );
      return;
    }
    if (u !== "primary") {
      await readPublishedCatalogCache(source.cacheKey);
      return;
    }
    let m = nZ(),
      p = await checkCatalogKey(source),
      C = p === void 0 ? "nothing cached, no request" : "cache",
      R,
      P = !1,
      A = n || source.kind === "file",
      U = (headless || !n) && source.kind === "file",
      ye = () => (U ? q : Math.max(0, i - Date.now())),
      we = U ? q : s,
      M = n && source.kind !== "file" ? Ogt(source.cacheKey) : null,
      B = p === void 0 ? A : isCacheEntryStale(p) && (headless ? U : A),
      Y = async (b) => {
        let O = startPublishedRefresh(M, a),
          Q = await awaitRefreshOutcome(O.refresh, { waitMs: ye(), budgetMs: we, label: b });
        if (Q.outcome === void 0) await O.countSpentWait();
        return Q;
      };
    if (B && M !== null && (headless ? !(await isRetryDue(M)) : await isInRetryBackoff(M))) {
      if (((P = !0), (r = { held_off: !0 }), !headless))
        startPublishedRefresh(M, a).refresh.catch((b) => logError(b));
      C = `${p === void 0 ? "nothing cached" : "stale cache"}, ${headless ? "no request: a recent headless request failed and its hold-off has not passed" : "not waiting: the last request timed out or failed recently, so this one runs in the background"}`;
    } else if (B && p === void 0) {
      let b = await Y("published catalog first fetch");
      ((p = b.outcome?.entry), (R = b.fetchStatus), (r = b.fields), (C = `fetch:${R} after ${b.waitMs}ms`));
    } else if (B && p !== void 0) {
      let b = await Y("published catalog stale refresh");
      ((R = b.fetchStatus),
        (r = b.fields),
        (p = b.outcome?.entry ?? p),
        (C = `stale cache: waited ${b.waitMs}ms for refresh \u2192 ${isCacheEntryStale(p) ? "kept stale" : "refreshed"} (fetch:${R})`));
    }
    if (O3t() !== o) return;
    let J = p?.document ?? kCn();
    if (J !== null && isHeldForModel(J, providerCatalogKey(getAPIProvider()))) {
      applyPublishedFallback(
        "publisher_hold",
        "the publisher holds this backend on compiled behavior",
        buildDecisionFields(headless, r, d),
      );
      return;
    }
    let { catalog: catalog, kind: kind } = selectCatalogSource(p, m);
    if (catalog === null) {
      if (p !== void 0)
        applyPublishedFallback(
          "surface_not_served",
          "document serves this surface no rows",
          buildDecisionFields(headless, r, d),
        );
      else if (P)
        applyPublishedFallback(
          headless ? "headless_held_off" : "held_off",
          `no seed, ${C}`,
          buildDecisionFields(headless, r, d),
        );
      else if (A)
        applyPublishedFallback(
          `${headless && M !== null ? "headless_" : ""}fetch_${R ?? "none"}`,
          `nothing cached and no seed, ${C} produced no rows`,
          buildDecisionFields(headless, r, d),
        );
      else
        applyPublishedFallback(
          a ? "deferred_no_cache" : "headless_no_cache",
          `nothing cached, ${a ? "a third-party launch does not wait for the fetch" : "this headless launch may not fetch"}, no seed`,
          buildDecisionFields(headless, r, d),
        );
      return;
    }
    if (kind === "seed") {
      let b = findMissingFamilyDefault(catalog);
      if (b !== null) {
        applyPublishedFallback(
          "seed_stale",
          `${C}; compiled seed resolves ${b.family} to ${b.seed}, this build to ${b.compiled}`,
          buildDecisionFields(headless, r, d),
        );
        return;
      }
      let O = isFirstPartyApiBackend() ? null : findSeedMismatch(catalog);
      if (O !== null) {
        applyPublishedFallback(
          "seed_moves_model",
          `compiled seed would move ${O.what} to ${O.seed}${O.compiled === void 0 ? "" : `, this build's table says ${O.compiled}`}`,
          buildDecisionFields(headless, r, d),
        );
        return;
      }
    }
    if (offeredCatalogRows(catalog).length === 0) {
      applyPublishedFallback(
        activeCatalogModels(catalog).length === 0 ? "no_selectable_rows" : "no_offered_rows",
        `published rows hold no model this build offers (${catalogModels(catalog).length} rows via ${kind})`,
        buildDecisionFields(headless, r, d),
      );
      return;
    }
    let X = p !== void 0 && isCacheEntryStale(p);
    if ((setServedCatalog(catalog, p?.fetchedAt, X), kind === "seed"))
      logFeatureSad("model_catalog_published", "seed", buildDecisionFields(headless, r, d));
    else if (d)
      logFeatureSad(
        "model_catalog_published",
        "remote_settings_unconfirmed",
        buildDecisionFields(headless, r, !1),
      );
    else logFeatureOk("model_catalog_published", buildDecisionFields(headless, r, !1));
    logForDebugging(
      `[publishedCatalog] primary: using ${kind} rows (${catalogModels(catalog).length} rows via ${C}${X ? ", stale" : ""})`,
    );
  } catch (error) {
    logError(error);
    let a = O3t();
    if ((a === void 0 || vPr(a)) && Vrn() === "primary")
      applyPublishedFallback("exception", "exception", buildDecisionFields(headless, r, !1));
  }
}
/**
 * 启动已发布目录刷新；有重试标记作用域时把标记更新串行化，并提供 countSpentWait 在等待耗尽而获取未完成时记一次超时退避。
 */
//@ chunk-c0w5a81j.js:22570-22974 placement
function startPublishedRefresh(e, r) {
  let o = refreshPublishedCatalogOnce({ allowNetwork: r });
  if (e === null) return { refresh: o, countSpentWait: () => Promise.resolve() };
  let resolved = Promise.resolve(),
    n = !1,
    s = !1;
  return {
    refresh: o.then(async (h) => {
      n = !0;
      let u = j(h);
      return (
        (resolved = resolved.then(async () => {
          if (!s || h.fetchStatus === "ok" || h.fetchStatus === "not_modified")
            await settlePublishedRefresh(e, h, u);
        })),
        await resolved,
        h
      );
    }),
    countSpentWait: () => (
      (resolved = resolved.then(async () => {
        if (!n) ((s = !0), await writeRetryMarker(e, "back_off", Date.now(), !0));
      })),
      resolved
    ),
  };
}
/**
 * 在限定时间内等待刷新结果，返回结果、获取状态（超时记为 timeout）、等待毫秒数与遥测字段。
 */
//@ chunk-c0w5a81j.js:22974-23438 placement
async function awaitRefreshOutcome(e, { waitMs: waitMs, budgetMs: budgetMs, label: label }) {
  let startTime = performance.now(),
    s = await withTimeout(e, waitMs, label).catch(() => {
      return;
    }),
    i = s === void 0 ? "timeout" : s.fetchStatus,
    rounded = Math.round(performance.now() - startTime);
  return {
    outcome: s,
    fetchStatus: i,
    waitMs: rounded,
    fields: {
      fetch_status: fromEnum(i),
      ...(s?.fetchReason !== void 0 && { fetch_reason: fromEnum(s.fetchReason) }),
      ...(s?.httpStatus !== void 0 && { http_status: s.httpStatus }),
      ...(s?.fetchMs !== void 0 && { fetch_ms: s.fetchMs }),
      wait_ms: rounded,
      wait_budget_ms: budgetMs,
      wait_timed_out: s === void 0,
    },
  };
}
/**
 * 存在托管的模型拒绝规则时，读取（含忽略环境 URL 的）已发布目录缓存文档，供拒绝规则匹配行名使用；失败只记录日志。
 */
//@ chunk-c0w5a81j.js:23438-23838 placement
async function loadPublishedDenyDocuments() {
  try {
    if (getPublishedCatalogBlock() === "policy") return;
    let { hasManagedModelDenies: hasManagedModelDenies } = await import("./chunk-d2gvw8te.js");
    if (!hasManagedModelDenies()) return;
    let r = new Set(),
      o = [];
    for (let n of [resolvePublishedCatalogSource({ ignoreEnvUrl: !0 }), resolvePublishedCatalogSource()]) {
      if (!n.ok || r.has(n.source.cacheKey)) continue;
      r.add(n.source.cacheKey);
      let s = await checkCatalogKey(n.source);
      if (s !== void 0) o.push(s.document);
    }
    let a = getProviderState();
    ((a.publishedDenyDocuments = o), (a.publishedRowNames = void 0));
  } catch (error) {
    logError(error);
  }
}
/**
 * 比较目录给出的各族别名与 Default 目标和编译期默认值，返回第一个不一致项（族别名或 Default），全部一致返回 null。
 */
//@ chunk-c0w5a81j.js:23838-24217 placement
function findSeedMismatch(e) {
  let r = getAPIProvider();
  for (let n of [...a6e, "fable"]) {
    let s = getFamilyDefault(e, n);
    if (s === void 0) continue;
    let i = resolveCatalogAlias(n, providerCatalogKey(r));
    if (i === void 0 || Bae(s) !== Bae(i) || ve(s) !== ve(i))
      return { what: `the ${n} alias`, seed: s, compiled: i };
  }
  let o = Wat() ? providerModelOverrides(e, "default") : {},
    a = o.perProvider ?? o.everywhere ?? (r === "firstParty" ? e.state?.model : void 0);
  return a === void 0 ? null : { what: "the Default", seed: a, compiled: void 0 };
}
//@ chunk-c0w5a81j.js:24217-24256 placement
function ve(e) {
  return /\[1m\]/i.test(e);
}
//@ chunk-c0w5a81j.js:24256-24370 placement
function selectCatalogSource(e, r) {
  if (e !== void 0) return { catalog: surfaceStateFor(e.document, r), kind: e.source };
  return { catalog: cwi(r), kind: "seed" };
}
/**
 * 若服务端托管设置尚未确认，最多等待到截止时间；仍未确认则记录并返回 true（本会话不使用这些设置决定目录）。
 */
//@ chunk-c0w5a81j.js:24370-24712 placement
async function waitForRemoteSettings(e) {
  if (ht()) {
    let r = e - Date.now();
    if (r > 0)
      (logForDebugging(`[publishedCatalog] waiting up to ${r}ms for server-managed settings to be confirmed`),
        await waitForLoadStatus(r));
  }
  if (!isManagedCatalogSourceUnverified()) return !1;
  return (
    logForDebugging(
      "[publishedCatalog] server-managed settings name managed model-catalog source settings the server has not confirmed; deciding this session without them",
    ),
    !0
  );
}
//@ chunk-c0w5a81j.js:24712-24801 placement
function ft() {
  let e = getPublishedCatalogBlock();
  return (
    e === null ||
    (e === "essential_traffic" &&
      (isUnverifiedFileCatalogSource() || getRemoteManagedSettingsSyncFromCache() === null))
  );
}
//@ chunk-c0w5a81j.js:24801-24880 placement
function ht() {
  if (
    !computeRemoteSettingsEligibility() ||
    isRemoteManagedSettingsVerified() ||
    getLastLoadStatus() !== void 0
  )
    return !1;
  return isManagedCatalogSourceUnverified() || getRemoteManagedSettingsSyncFromCache() === null;
}
//@ chunk-c0w5a81j.js:24880-25020 placement
async function waitForLoadStatus(e) {
  let r = () => {},
    promise = new Promise((a) => {
      if (
        ((r = onLastLoadStatusChanged((n) => {
          if (n !== void 0) a();
        })),
        getLastLoadStatus() !== void 0)
      )
        a();
    });
  try {
    await withDeadline(promise, e);
  } finally {
    r();
  }
}
//@ chunk-c0w5a81j.js:25020-25120 placement
function buildDecisionFields(e, r, o) {
  return {
    auth_kind: fromEnum(catalogCredentialKind()),
    headless: e,
    ...r,
    ...(o && { remote_settings_unconfirmed: !0 }),
  };
}
//@ chunk-c0w5a81j.js:25120-25273 placement
function applyPublishedFallback(e, r, o) {
  (setServedCatalog(null),
    logFeatureSad("model_catalog_published", e, o),
    logForDebugging(
      `[publishedCatalog] primary: published rows unavailable (${r}); using compiled behavior`,
    ));
}
/**
 * 确保本会话只做一次模型目录决策，返回该决策的 Promise。
 */
//@ chunk-c0w5a81j.js:25273-25407 placement
function ensureCatalogDecision({ headless: headless }) {
  let r = getProviderState();
  if (r.catalogDecision === void 0) r.catalogDecision = mt(headless).catch((o) => logError(o));
  return r.catalogDecision;
}
//@ chunk-c0w5a81j.js:25407-25485 placement
async function mt(e) {
  (await loadCatalogCache({ headless: e }),
    await resolvePrimaryCatalog({ headless: e }),
    await loadPublishedDenyDocuments());
}
//@ chunk-3wek6r2k.js:80328-80820 placement
async function refreshServedModelCapabilities(e, o) {
  if (!isModelCapabilitiesCacheEnabled()) return;
  if (isEssentialTrafficOnly()) return;
  if (isDiskless()) return;
  try {
    if (await loadFreshCapabilities(Bn(getMainLoopModel()), e)) {
      logForDebugging("[modelCapabilities] cached model list is recent enough, not fetching");
      return;
    }
    let n = await getAnthropicClient({
        maxRetries: 1,
        agentContext: mainAgentContext(),
        credentials: o,
        storageV5: e,
      }),
      r = isClaudeAISubscriber() ? [OAUTH_BETA_HEADER] : void 0,
      u = [];
    for await (let p of n.models.list({ betas: r, limit: 1000 })) {
      let h = parseModelCapability(p);
      if (h) u.push(h);
    }
    if (u.length === 0) return;
    await refreshModelCapabilities(u, e);
  } catch (error) {
    logForDebugging(
      `[modelCapabilities] fetch failed: ${error instanceof Error ? error.message : "unknown"}`,
    );
  }
}
//@ chunk-3wek6r2k.js:80820-81293 placement
function pickerSnapshot() {
  let e = getEnabledModelOptions(),
    o = dedupeModelIds(Ja(e)),
    n = dedupeModelIds(Ja(e.filter((h) => !h.sessionTail))),
    r = getMainLoopModel(),
    u = getCanonicalName(r),
    p = getModelMaxOutputTokens(r);
  return {
    pickerIds: o,
    basePickerIds: n,
    defaultModel: getDefaultMainLoopModel(),
    aliasTargets: {
      opus: getDefaultOpusModel(),
      sonnet: getDefaultSonnetModel(),
      haiku: getDefaultHaikuModel(),
    },
    mainLoopModel: r,
    mainLoopCanonical: u,
    contextWindow: getContextWindow(r, getSdkBetas()),
    maxOutputTokens: p.upperLimit,
    defaultOutputTokens: p.default,
    defaultOutputTokensRequested: defaultMaxOutputTokens(r),
    defaultEffort: String(getDefaultEffortForModel(r)),
    defaultEffortPinnedAboveServed: khi(r),
    capabilities: EFFORT_CAPABILITY_KEYS.filter((h) => modelDefinitelySupports(u, h, r) === !0),
  };
}
/**
 * 对比服务端下发的模型目录与本地编译目录、选择器列表，得出差异。
 */
//@ chunk-3wek6r2k.js:81293-82907 placement
function compareServedCatalog(e, o, n) {
  let r = dedupeModelIds(sci({ catalog: e, provenance: n })),
    pickerIds = o.pickerIds,
    p = dedupeModelIds(ici({ catalog: e, provenance: n })),
    basePickerIds = o.basePickerIds,
    mapped = basePickerIds.map(Za),
    mapped_2 = p.map(Za),
    M = new Set(mapped),
    E = new Set(mapped_2),
    w = count(mapped_2, (ve) => !M.has(ve)),
    P = count(mapped, (ve) => !E.has(ve)),
    A = getFamilyDefaults(e),
    se = offeredCatalogRows(e),
    q = getModelCatalogStatus(e, o.mainLoopModel),
    ce =
      q.status === "known"
        ? [
            o.mainLoopModel,
            getCatalogState().modelKnowledge?.identitySpelling(o.mainLoopModel),
            o.mainLoopCanonical,
          ].find((ve) => ve !== void 0 && D3(e, ve) !== void 0)
        : void 0,
    pe = ce === void 0 ? void 0 : l6e(getDefaultOutputTokens(e, ce), Axt),
    Re =
      ce === void 0
        ? o.defaultOutputTokens
        : Math.min(pe ?? o.defaultOutputTokensRequested, l6e(Los(e, ce), Axt) ?? o.maxOutputTokens),
    He = ce === void 0 ? void 0 : getDefaultEffort(e, ce),
    $e = o.defaultEffortPinnedAboveServed || He === void 0 ? o.defaultEffort : He;
  return {
    picker: {
      match: Qa(pickerIds, r),
      old: pickerIds,
      new: r,
      main: {
        match: Qa(mapped, mapped_2),
        setMatch: w === 0 && P === 0,
        old: basePickerIds,
        new: p,
        added: w,
        removed: P,
        overflowCount: r.length - p.length,
      },
    },
    defaultModel: compareModelIds(o.defaultModel, Dos(e)),
    aliases: {
      opus: compareModelIds(o.aliasTargets.opus, A.opus),
      sonnet: compareModelIds(o.aliasTargets.sonnet, A.sonnet),
      haiku: compareModelIds(o.aliasTargets.haiku, A.haiku),
    },
    mainLoopModel: o.mainLoopModel,
    contextWindow: Xa(o.contextWindow, YSi(e, o.mainLoopModel)),
    maxOutputTokens: Xa(o.maxOutputTokens, Los(e, o.mainLoopModel)),
    defaultOutputTokens: {
      match: ce === void 0 ? void 0 : o.defaultOutputTokens === Re,
      old: o.defaultOutputTokens,
      new: Re,
      servedHasValue: pe !== void 0,
    },
    defaultEffort: {
      match: ce === void 0 ? void 0 : o.defaultEffort === $e,
      old: o.defaultEffort,
      new: $e,
      servedHasValue: He !== void 0,
    },
    mainLoopKnowledge: q,
    offeredCount: se.length,
    mappedCount: count(se, (ve) => getModelCatalogStatus(e, ve.id).status === "mapped"),
    notOfferedCount: gwi(e).length,
    capabilities: compareEffortCapabilities(D3(e, o.mainLoopModel), o.capabilities),
    familyDefaultCount: Ku(e),
  };
}
//@ chunk-3wek6r2k.js:82907-83152 placement
function compareEffortCapabilities(e, o) {
  let n = e?.runtime?.capabilities;
  if (n === void 0) return { match: void 0, servedCount: 0 };
  let r = EFFORT_CAPABILITY_KEYS,
    u = uniq(n.map((h) => h.trim().toLowerCase()).filter((h) => r.includes(h))),
    p = new Set(o);
  return { match: u.every((h) => p.has(h)), servedCount: u.length };
}
//@ chunk-3wek6r2k.js:83152-83176 placement
function Ku(e) {
  return 0;
}
//@ chunk-3wek6r2k.js:83176-83279 placement
function dedupeModelIds(e) {
  let o = new Set(),
    n = [];
  for (let r of e) {
    let u = normalizeModelId(r);
    if (!o.has(u)) (o.add(u), n.push(u));
  }
  return n;
}
//@ chunk-3wek6r2k.js:83279-83384 placement
function compareModelIds(e, o) {
  let n = normalizeModelId(e),
    r = o === void 0 ? void 0 : normalizeModelId(o);
  return { match: r === void 0 ? void 0 : n === r, old: n, new: r };
}
//@ chunk-3wek6r2k.js:83384-83451 placement
function Xa(e, o) {
  return { match: o === void 0 ? void 0 : e === o, old: e, new: o };
}
//@ chunk-3wek6r2k.js:83451-83533 placement
function Ja(e) {
  return e.flatMap((o) => (o.value === null ? [] : [o.value])).map((o) => parseUserSpecifiedModel(o));
}
//@ chunk-3wek6r2k.js:83533-83603 placement
function Qa(e, o) {
  return e.length === o.length && e.every((n, r) => n === o[r]);
}
//@ chunk-3wek6r2k.js:83603-83653 placement
function Za(e) {
  return normalizeModelId(e).replace(/-\d{8}$/, "");
}
//@ chunk-3wek6r2k.js:83653-83857 placement
function startServedCatalog({ allowNetwork: allowNetwork }) {
  if (iHe() === "off") {
    logForDebugging(`[servedCatalog] off (${servedModelCatalogEligibility() ?? "flag"})`);
    return;
  }
  let o = getProviderState();
  if (o.servedCatalogShadowStarted) return;
  ((o.servedCatalogShadowStarted = !0), loadServedCatalog(allowNetwork).catch((n) => logError(n)));
}
//@ chunk-3wek6r2k.js:83857-84544 placement
async function loadServedCatalog(e) {
  let o = Toe(),
    n = nZ(),
    r = e && isPlainNonInteractive() && o !== null ? catalogCacheFilePath(o, n) : null,
    u = e && (r === null || (await isRetryDue(r))),
    p = await refreshServedCatalogOnce({ allowNetwork: u });
  if (p.mode === "off") return;
  if (r !== null && u) await settleServedRefresh(r, p);
  let h = p.entry?.catalog ?? null,
    S = p.fetchStatus !== "cache_fresh" && p.fetchStatus !== "cache_only";
  if (h === null && !S && (isPlainNonInteractive() || !e)) return;
  let y = null,
    M = !1;
  if (h !== null)
    try {
      y = compareServedCatalog(h, withCatalogSuppressed(pickerSnapshot), "served");
    } catch (error) {
      ((M = !0), logError(error));
    }
  (logEvent(
    "tengu_model_catalog_compare",
    logServedCatalogOutcome({
      outcome: p,
      catalog: h,
      comparison: y,
      compareFailed: M,
      catalogSource: servedCatalogSource(),
    }),
  ),
    logForDebugging(
      `[servedCatalog] shadow compare logged (fetch=${p.fetchStatus}, rows=${h === null ? 0 : catalogModels(h).length}, source=${servedCatalogSource() ?? "compiled"})`,
    ),
    reconcileServedModels(y, ol({ catalog: h, prior: p.prior, sessionMaskedIds: getMaskedModelIds() })));
}
//@ chunk-3wek6r2k.js:84544-84940 placement
function reconcileServedModels(e, o) {
  let n = activeServedCatalog();
  if (e === null || n === null) return;
  let r = new Set(qSi(n).map((p) => firstPartyNameToCanonical(normalizeModelId(p)))),
    mapped = e.picker.old
      .filter((p) => !r.has(firstPartyNameToCanonical(p)))
      .map((p) => (o(p) ? CONFIDENTIAL_MODEL_ID : p));
  logForDebugging(
    mapped.length === 0
      ? "[servedCatalog] primary: served list replaces the compiled picker; every compiled row is served"
      : `[servedCatalog] primary: served list replaces the compiled picker; compiled rows not served (dropped): ${mapped.join(", ")}`,
  );
}
//@ chunk-3wek6r2k.js:84940-85053 placement
var DEFAULT_MODEL_SOURCES = [
  "global_default",
  "org_configuration",
  "custom_role_configuration",
  "user_setting",
  "most_capable_fallback",
];
//@ chunk-3wek6r2k.js:85053-85202 placement
function collectHiddenModelIds({ catalog: catalog, prior: prior, sessionMaskedIds: sessionMaskedIds }) {
  let r = prior?.catalog ?? null;
  return new Set([
    ...(catalog === null ? [] : getHiddenModelIds(catalog)),
    ...(r === null || r === catalog ? [] : getHiddenModelIds(r)),
    ...sessionMaskedIds,
  ]);
}
//@ chunk-3wek6r2k.js:85202-85273 placement
function ol(e) {
  return qr([e.catalog, e.prior?.catalog ?? null], () => collectHiddenModelIds(e));
}
//@ chunk-3wek6r2k.js:85273-85365 placement
function qr(e, o) {
  if (e.some((r) => r !== null && vpr(r))) return () => !0;
  let n = o();
  return (r) => ap(r, n);
}
//@ chunk-3wek6r2k.js:85365-86303 placement
function logServedCatalogOutcome({
  outcome: outcome,
  catalog: catalog,
  comparison: comparison,
  compareFailed: compareFailed,
  catalogSource: catalogSource,
  authKind: authKind = catalogCredentialKind(),
  sessionMaskedIds: sessionMaskedIds = getMaskedModelIds(),
  now: now = Date.now(),
}) {
  let y = ol({ catalog: catalog, prior: outcome.prior, sessionMaskedIds: sessionMaskedIds }),
    entry = outcome.entry,
    E = catalog?.state?.selection_source;
  return {
    mode: fromEnum(outcome.mode),
    surface: fromEnum(outcome.surface),
    catalog_source: fromEnumOpt(catalogSource),
    route: fromEnumOpt(outcome.route),
    credential: fromEnumOpt(outcome.credential),
    auth_kind: fromEnum(authKind),
    resolution: outcome.route === "orgless" ? fromEnum(outcome.resolution ?? "unknown") : void 0,
    fetch_status: fromEnum(outcome.fetchStatus),
    fetch_reason: fromEnumOpt(outcome.fetchReason),
    http_status: outcome.httpStatus,
    fetch_ms: outcome.fetchMs,
    cache_age_s: entry === void 0 ? void 0 : Math.max(0, Math.round((now - entry.fetchedAt) / 1000)),
    served: catalog !== null,
    served_row_count: catalog === null ? 0 : catalogModels(catalog).length,
    served_selectable_count: catalog === null ? 0 : activeCatalogModels(catalog).length,
    served_confidential_count: catalog === null ? 0 : QSi(catalog).size,
    served_has_default: catalog?.state?.model !== void 0,
    served_has_runtime: catalog !== null && lto(catalog),
    selection_source:
      E === void 0 ? void 0 : (fromEnumOpt(DEFAULT_MODEL_SOURCES.find((w) => w === E)) ?? lit("other")),
    compare_failed: compareFailed,
    ...catalogTelemetryFields(comparison, y),
  };
}
//@ chunk-3wek6r2k.js:86303-88115 placement
function catalogTelemetryFields(e, o) {
  if (e === null) return {};
  let mainLoopKnowledge = e.mainLoopKnowledge,
    main = e.picker.main;
  return {
    main_loop_model: Kr(e.mainLoopModel, o),
    behaves_as_applied: mainLoopKnowledge.status === "mapped",
    behaves_as_source:
      mainLoopKnowledge.status === "mapped" ? fromEnum(mainLoopKnowledge.source) : lit("none"),
    unknown_unmapped: mainLoopKnowledge.status === "unknown",
    served_offered_count: e.offeredCount,
    served_mapped_count: e.mappedCount,
    served_not_offered_count: e.notOfferedCount,
    capabilities_match: e.capabilities.match,
    served_capability_count: e.capabilities.servedCount,
    served_family_default_count: e.familyDefaultCount,
    picker_match: main.match,
    picker_set_match: main.setMatch,
    picker_added_count: main.added,
    picker_removed_count: main.removed,
    picker_full_match: e.picker.match,
    served_overflow_count: main.overflowCount,
    default_match: e.defaultModel.match,
    opus_match: e.aliases.opus.match,
    sonnet_match: e.aliases.sonnet.match,
    haiku_match: e.aliases.haiku.match,
    context_window_match: e.contextWindow.match,
    max_output_match: e.maxOutputTokens.match,
    default_output_match: e.defaultOutputTokens.match,
    served_has_default_output: e.defaultOutputTokens.servedHasValue,
    default_effort_match: e.defaultEffort.match,
    served_has_default_effort: e.defaultEffort.servedHasValue,
    ...((!e.picker.match || !main.match) && {
      picker_old: Cn(e.picker.old, o),
      picker_new: Cn(e.picker.new, o),
      picker_old_count: e.picker.old.length,
      picker_new_count: e.picker.new.length,
    }),
    ...(!main.match && {
      picker_base_old: Cn(main.old, o),
      picker_main_new: Cn(main.new, o),
      picker_base_old_count: main.old.length,
      picker_main_new_count: main.new.length,
    }),
    ...diffFields("default", e.defaultModel, o),
    ...diffFields("opus", e.aliases.opus, o),
    ...diffFields("sonnet", e.aliases.sonnet, o),
    ...diffFields("haiku", e.aliases.haiku, o),
    ...Vr("context_window", e.contextWindow),
    ...Vr("max_output", e.maxOutputTokens),
    ...Vr("default_output", e.defaultOutputTokens),
    ...(e.defaultEffort.match === !1 && {
      default_effort_old: el(e.defaultEffort.old),
      default_effort_new: el(e.defaultEffort.new),
    }),
  };
}
//@ chunk-3wek6r2k.js:88115-88125 placement
var rp = 50;
//@ chunk-3wek6r2k.js:88125-88186 placement
function Kr(e, o) {
  return o(e) ? lit(CONFIDENTIAL_MODEL_ID) : (telemetrySafeModelName(e) ?? lit("nonconforming"));
}
//@ chunk-3wek6r2k.js:88186-88240 placement
function Cn(e, o) {
  return Bwi(
    e.map((n) => (o(n) ? CONFIDENTIAL_MODEL_ID : n)),
    rp,
  );
}
//@ chunk-3wek6r2k.js:88240-88282 placement
function ap(e, o) {
  return containsMaskedId(e, o) || !maskModelIdCached(e);
}
//@ chunk-3wek6r2k.js:88282-88406 placement
function diffFields(e, o, n) {
  if (o.match !== !1) return {};
  return { [`${e}_old`]: Kr(o.old, n), [`${e}_new`]: o.new === void 0 ? void 0 : Kr(o.new, n) };
}
//@ chunk-3wek6r2k.js:88406-88494 placement
function Vr(e, o) {
  if (o.match !== !1) return {};
  return { [`${e}_old`]: o.old, [`${e}_new`]: o.new };
}
//@ chunk-3wek6r2k.js:88494-88589 placement
function el(e) {
  if (isEffortLevel(e)) return fromEnum(e);
  let o = Number(e);
  return Number.isFinite(o) ? fromNumber(o) : lit("other");
}
//@ chunk-3wek6r2k.js:88589-88776 placement
function startServedCatalogShadow({ allowNetwork: allowNetwork }) {
  if (!Krn()) return;
  let o = getProviderState();
  if (o.servedCatalogShadowStarted) {
    if (allowNetwork && isPlainNonInteractive()) fetchServedCatalog(allowNetwork).catch((n) => logError(n));
    return;
  }
  ((o.servedCatalogShadowStarted = !0), applyServedCatalog(allowNetwork).catch((n) => logError(n)));
}
//@ chunk-3wek6r2k.js:88776-88815 placement
function shouldFetchServedCatalog() {
  return !getIsNonInteractiveSession() || (isPlainNonInteractive() && h1n());
}
//@ chunk-3wek6r2k.js:88815-89087 placement
async function fetchServedCatalog(e) {
  let o = isPlainNonInteractive(),
    n = o || (isFirstPartyApiBackend() && Vrn() === "primary"),
    r = resolvePublishedCatalogSource(),
    u =
      e && n && r.ok && r.source.kind !== "file" && r.source.trust.kind !== "untrusted"
        ? Ogt(r.source.cacheKey)
        : null,
    p = e && (u === null || !o || (await isRetryDue(u))),
    h = await refreshPublishedCatalogOnce({ allowNetwork: p });
  if (u !== null && p) await settlePublishedRefresh(u, h);
  return h;
}
//@ chunk-3wek6r2k.js:89087-89725 placement
async function applyServedCatalog(e) {
  let o = await fetchServedCatalog(e);
  if (o.fetchStatus === "off") return;
  let n = nZ(),
    r = o.entry === void 0 ? null : surfaceStateFor(o.entry.document, n),
    u =
      o.source?.kind !== "file" &&
      (o.fetchStatus === "ok" ||
        o.fetchStatus === "not_modified" ||
        o.fetchStatus === "error" ||
        o.fetchStatus === "rejected");
  if (r === null && !u && (isPlainNonInteractive() || !e)) return;
  let p = null,
    h = !1;
  if (r !== null)
    try {
      p = compareServedCatalog(r, withCatalogSuppressed(pickerSnapshot), "published");
    } catch (error) {
      ((h = !0), logError(error));
    }
  (logEvent(
    "tengu_model_catalog_compare",
    servedCatalogDiagnostics({
      outcome: o,
      catalog: r,
      comparison: p,
      compareFailed: h,
      catalogSource: servedCatalogSource(),
      activeCatalog: activeServedCatalog(),
    }),
  ),
    logForDebugging(
      `[publishedCatalog] shadow compare logged (fetch=${o.fetchStatus}, rows=${r === null ? 0 : catalogModels(r).length}, source=${servedCatalogSource() ?? "compiled"})`,
    ));
}
//@ chunk-3wek6r2k.js:89725-90632 placement
function servedCatalogDiagnostics({
  outcome: outcome,
  catalog: catalog,
  comparison: comparison,
  compareFailed: compareFailed,
  catalogSource: catalogSource,
  activeCatalog: activeCatalog = null,
  authKind: authKind = catalogCredentialKind(),
  sessionMaskedIds: sessionMaskedIds = getMaskedModelIds(),
  now: now = Date.now(),
}) {
  let M = qr(
      [catalog, activeCatalog],
      () =>
        new Set([
          ...(catalog === null ? [] : getHiddenModelIds(catalog)),
          ...(activeCatalog === null || activeCatalog === catalog ? [] : getHiddenModelIds(activeCatalog)),
          ...sessionMaskedIds,
        ]),
    ),
    entry = outcome.entry,
    w = entry?.document,
    P = O6n(entry?.rootId);
  return {
    mode: fromEnum(outcome.mode),
    surface: fromEnum(nZ()),
    catalog_source: fromEnumOpt(catalogSource),
    auth_kind: fromEnum(authKind),
    published_fetch_status: fromEnum(outcome.fetchStatus),
    published_fetch_reason: fromEnumOpt(outcome.fetchReason),
    published_http_status: outcome.httpStatus,
    published_fetch_ms: outcome.fetchMs,
    published_source: settingsSourceTag(outcome, catalog),
    published_version: w?.version,
    published_trust: fromEnumOpt(P),
    published_expired: outcome.expired,
    published_age_s: entry === void 0 ? void 0 : Math.max(0, Math.round((now - entry.fetchedAt) / 1000)),
    served: catalog !== null,
    served_row_count: catalog === null ? 0 : catalogModels(catalog).length,
    served_selectable_count: catalog === null ? 0 : activeCatalogModels(catalog).length,
    served_has_default: catalog?.state?.model !== void 0,
    served_has_runtime: catalog !== null && lto(catalog),
    compare_failed: compareFailed,
    ...managedKeyTelemetry(P, comparison, M),
  };
}

export {
  refreshServedModelCapabilities,
  startServedCatalog,
  startServedCatalogShadow,
  shouldFetchServedCatalog,
  ensureCatalogDecision,
  catalogTelemetryFields,
  fetchModelSelector,
  Re,
  Z,
  formatRefusalSuffix,
  xe,
  parseCatalogResolution,
  formatResolutionSuffix,
  $e,
  dDs,
};
