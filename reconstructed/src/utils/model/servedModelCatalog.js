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
import { normalizeUuidOrNull } from "../agentId.js";
import {
  ACCOUNT_KIND_VALUES,
  isValidEtag,
  CATALOG_SCHEMA,
  getSchemaVersion,
  CATALOG_SCHEMA_VERSION,
  CatalogDocumentSchema,
  bundledCatalogVersion,
  servedCatalogActive,
  bundledCatalogDocument,
  isHeldForModel,
  findMissingFamilyDefault,
  modelIdentityKey,
  surfaceStateFor,
  bundledSurfaceState,
  clampInRange,
  OUTPUT_TOKEN_RANGE,
  withCatalogSuppressed,
  servedCatalogSource,
  activeServedCatalog,
} from "./modelCatalog/servedCatalog.js";
import {
  catalogEndpointForScope,
  catalogAuthKind,
  CACHE_TTL_MS,
  jitteredTtl,
  STALE_JITTER_RATIO,
  isCatalogCacheStale,
  servedCatalogMode,
  catalogSurface,
  catalogScope,
  catalogCacheKey,
  loadCachedCatalog,
  fetchServedCatalogOnce,
  isSameCatalogScope,
  buildCatalogCacheEntry,
  saveCachedCatalog,
  withFetchTimes,
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
} from "./publishedCatalogCache.js";
import {
  registerPublicIds,
  activateServedCatalog,
  activateFallbackCatalog,
  setServedCatalog,
  normalizeModelId,
  getMaskedModelIds,
  CONFIDENTIAL_MODEL_ID,
  getHiddenModelIds,
  hasDroppedUnidentifiedRows,
  containsMaskedId,
  maskModelIdCached,
} from "./modelCatalog/catalogEntries.js";
import { logError } from "../log.js";
import {
  isManagedCatalogSourceUnverified,
  verifyCatalogSignature as verifyCatalogSignature_2,
  classifyKeySource,
  resolvePublishedCatalogSource,
  fetchPublishedCatalog as fetchPublishedCatalog_2,
  isUnverifiedFileCatalogSource,
} from "../../services/modelCatalog/publishedCatalog.js";
import { recordPublishedCatalogFloor, publishedFloorVersion } from "./modelCatalog/publishedCatalogFloor.js";
import {
  offeredCatalogRows,
  getFamilyDefault,
  supportsFamilyOverride,
  providerModelOverrides,
  getFamilyDefaults,
  getModelCatalogStatus,
  unselectableActiveRows,
} from "./modelCatalog/catalogCapabilities.js";
import {
  activeCatalogModels_2,
  catalogModels,
  isFirstPartyApiBackend,
  providerCatalogKey,
  getAPIProvider,
  MODEL_FAMILY_NAMES,
  findServedCatalogRow,
  getDefaultOutputTokens,
  servedMaxOutputTokensOf,
  getDefaultEffort,
  catalogStateModel,
  servedMaxInputTokensOf,
  activeCatalogModelIds,
  confidentialModelIds,
  catalogHasRuntime,
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
import { stripAnyVersatileSuffix } from "./modelIds.js";
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
import { getDefaultEffortForModel, hasAnyDefaultEffort, isEffortLevel } from "../effort.js";
import { selectableRowIds, selectableNonOverflowRowIds } from "./modelErrorOverrides.js";
import { count, uniq } from "../collections.js";
import { parseUserSpecifiedModel } from "./modelDisplay.js";
import { isPlainNonInteractive } from "../sessionShape.js";
import { logEvent } from "../../services/analytics/index.js";
import { telemetrySafeModelName, telemetrySafeModelList } from "./telemetryModelName.js";
import { settingsSourceTag, managedKeyTelemetry } from "../settings/settingsTelemetryKeys.js";

//@ chunk-c0w5a81j.js:1151-1219 placement
/**
 * 默认输出 token 数与"拒绝原因"枚举（未授权、IP 受限、通道不可用）。
 */
var DEFAULT_OUTPUT_TOKENS = 5000;
var REFUSAL_REASONS = ["not_permitted", "ip_restricted", "lane_unavailable"];
//@ chunk-c0w5a81j.js:1219-1260 placement
function isRefusalReason(e) {
  return REFUSAL_REASONS.some((r) => r === e);
}
//@ chunk-c0w5a81j.js:3112-3611 placement
function fetchModelSelector(state, repoSlug) {
  switch (state.kind) {
    case "account":
      return {
        path: `/api/organizations/:orgUUID/model_selector/${repoSlug}`,
        auth: "teleport-org",
        headers: {},
      };
    case "token":
      return {
        path: `/api/model_selector/${repoSlug}`,
        auth: "claude-ai-oauth",
        headers: {
          "anthropic-client-platform": getClientPlatform(),
        },
      };
    case "api_key":
      return {
        path: `/api/model_selector/${repoSlug}`,
        auth: "required",
        headers: {
          "anthropic-client-platform": getClientPlatform(),
        },
      };
    case "profile":
    case "federation":
      return {
        path: `/api/model_selector/${repoSlug}`,
        auth: "async",
        headers: {
          "anthropic-client-platform": getClientPlatform(),
        },
      };
  }
}
//@ chunk-c0w5a81j.js:3611-3779 placement
function parseCatalogResolution(e) {
  let lower = normalizeUuidOrNull(e.organization_uuid)?.toLowerCase();
  let found = ACCOUNT_KIND_VALUES.find((a) => a === e.resolution);
  return {
    ...(lower !== undefined && {
      organizationUuid: lower,
    }),
    ...(found !== undefined && {
      resolution: found,
    }),
  };
}
//@ chunk-c0w5a81j.js:3779-3857 placement
function formatResolutionSuffix(e) {
  return e.resolution === undefined ? "" : ` (resolution ${e.resolution})`;
}
//@ chunk-c0w5a81j.js:3857-4033 placement
var CREDENTIAL_SCOPE_CODES = ["oauth_scope_insufficient", "oauth_token_narrowed"];
var IP_NOT_IN_ALLOWED_RANGE = "ip_not_in_allowed_range";
var LANE_UNAVAILABLE_CODES = ["not_found", "account_session_invalid", "organization_not_visible"];
var KNOWN_REFUSAL_CODES = [...CREDENTIAL_SCOPE_CODES, IP_NOT_IN_ALLOWED_RANGE, ...LANE_UNAVAILABLE_CODES];
//@ chunk-c0w5a81j.js:4033-4088 placement
function firstMatchingCode(e, r) {
  let errorCode = getErrorCode(r);
  return e.find((a) => a === errorCode);
}
//@ chunk-c0w5a81j.js:4088-4141 placement
/**
 * 依次尝试各原因分类器，给出目录拒绝原因。
 */
function classifyRefusal(state, status, o) {
  return matchScopeRefusal(status, o) ?? matchIpRefusal(status, o) ?? matchLaneRefusal(state, status, o);
}
//@ chunk-c0w5a81j.js:4141-4263 placement
/**
 * 生成服务端目录拒绝的后缀说明（错误码与原因）。
 */
function formatRefusalSuffix(e) {
  if (e === undefined || !isRefusalReason(e.reason)) return "";
  return `${e.errorCode !== undefined ? ` ${e.errorCode}` : ""} (${describeRefusalReason(e.reason)})`;
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
  let o = firstMatchingCode(CREDENTIAL_SCOPE_CODES, r);
  if (e === 403 && o !== undefined)
    return {
      status: "error",
      reason: "not_permitted",
      httpStatus: e,
      errorCode: o,
    };
  return;
}
//@ chunk-c0w5a81j.js:4668-4785 placement
function matchIpRefusal(e, r) {
  if (e === 403 && getErrorCode(r) === IP_NOT_IN_ALLOWED_RANGE)
    return {
      status: "error",
      reason: "ip_restricted",
      httpStatus: e,
      errorCode: IP_NOT_IN_ALLOWED_RANGE,
    };
  return;
}
//@ chunk-c0w5a81j.js:4785-5058 placement
function matchLaneRefusal(e, r, o) {
  if (catalogEndpointForScope(e) !== "orgless") return;
  let a = firstMatchingCode(LANE_UNAVAILABLE_CODES, o);
  if (
    r === 404 ||
    (r === 403 && a === "account_session_invalid") ||
    (r === 401 && a === "organization_not_visible" && catalogAuthKind(e) === "profile")
  )
    return {
      status: "error",
      reason: "lane_unavailable",
      httpStatus: r,
      ...(a !== undefined && {
        errorCode: a,
      }),
    };
  return;
}
//@ chunk-c0w5a81j.js:5058-5173 placement
function getErrorCode(e) {
  let prop = getProp(e, "error");
  let prop_2 = getProp(getProp(prop, "details"), "error_code");
  return typeof prop_2 === "string" && prop_2.length > 0 ? prop_2 : undefined;
}
//@ chunk-c0w5a81j.js:5173-5246 placement
function getProp(prop, r) {
  return typeof prop === "object" && prop !== null && r in prop ? prop[r] : undefined;
}
//@ chunk-c0w5a81j.js:5246-5294 placement
/**
 * 取错误对象的 response.data。
 */
function responseData(error) {
  return getProp(getProp(error, "response"), "data");
}
//@ chunk-c0w5a81j.js:5294-5345 placement
/**
 * 取合法 ETag，不合法返回 undefined。
 */
function validEtagOrUndefined(headers) {
  let etag = headers?.etag;
  return isValidEtag(etag) ? etag : undefined;
}
//@ chunk-c0w5a81j.js:5345-5380 placement
var RETRY_BASE_MS = 30000;
var RETRY_CAP_MS = CACHE_TTL_MS;
var SLOW_FETCH_THRESHOLD_MS = 2000;
var FAILED_MARKER_READ_BYTES = 256;
//@ chunk-c0w5a81j.js:5380-5451 placement
function headlessFailedMarkerPath(e) {
  return `${e.replace(/\.json$/, "")}.headless-failed.json`;
}
//@ chunk-c0w5a81j.js:5451-5502 placement
function jitteredBackoff(failures, r = Math.random()) {
  return jitteredTtl(backoffDelayMs(failures), r);
}
//@ chunk-c0w5a81j.js:5502-5561 placement
function backoffDelayMs(e) {
  return Math.min(RETRY_BASE_MS * 2 ** (Math.max(1, e) - 1), RETRY_CAP_MS);
}
//@ chunk-c0w5a81j.js:5561-5597 placement
function backoffWithSlack(failures) {
  return backoffDelayMs(failures) * (1 + STALE_JITTER_RATIO);
}
//@ chunk-c0w5a81j.js:5597-5740 placement
async function isRetryDue(e, r = Date.now(), o = Math.random()) {
  let retryMarker = await readRetryMarker(e);
  if (retryMarker === undefined || retryMarker.failedAt > r) return true;
  return r - retryMarker.failedAt >= jitteredBackoff(retryMarker.failures, o);
}
//@ chunk-c0w5a81j.js:5740-5893 placement
async function isInRetryBackoff(e, r = Date.now(), o = Math.random()) {
  let retryMarker = await readRetryMarker(e);
  if (retryMarker === undefined || retryMarker.failedAt > r) return false;
  return retryMarker.timedOut || r - retryMarker.failedAt < jitteredBackoff(retryMarker.failures, o);
}
//@ chunk-c0w5a81j.js:5893-6385 placement
/**
 * 读取无头模式下服务端目录获取的重试标记文件（大小有上限），解析出失败时间、连续失败次数与是否超时；不存在或格式不对返回 undefined。
 */
async function readRetryMarker(e) {
  let r;
  try {
    r = (await maskStorage().readRange(headlessFailedMarkerPath(e), 0, FAILED_MARKER_READ_BYTES)).toString(
      "utf8",
    );
  } catch (error) {
    if (!isENOENT(error))
      logForDebugging(
        `[servedCatalog] headless retry marker read failed: ${getErrnoCode(error) ?? "unknown"}`,
      );
    return;
  }
  let o = safeParseJSON(r, false);
  if (typeof o !== "object" || o === null) return;
  let failedAt = "failedAt" in o ? o.failedAt : undefined;
  if (typeof failedAt !== "number" || !Number.isFinite(failedAt)) return;
  let failures = "failures" in o ? o.failures : undefined;
  return {
    failedAt,
    failures: typeof failures === "number" && Number.isSafeInteger(failures) && failures >= 1 ? failures : 1,
    timedOut: "timedOut" in o && o.timedOut === true,
  };
}
//@ chunk-c0w5a81j.js:6385-6455 placement
function isWithinFailureBackoff(e, r) {
  return e.failedAt <= r && r - e.failedAt < backoffWithSlack(e.failures) + RETRY_CAP_MS;
}
//@ chunk-c0w5a81j.js:6455-6823 placement
/**
 * 写入或清除重试标记：clear 删除文件；back_off 在上次失败基础上累加失败次数，retry_soon 重置为 1；以 0600 权限原子写入。
 */
async function writeRetryMarker(e, r, o = Date.now(), a = false) {
  let n = maskStorage();
  let s = headlessFailedMarkerPath(e);
  try {
    if (r === "clear") {
      await n.delete(s);
      return;
    }
    let i = r === "back_off" ? await readRetryMarker(e) : undefined;
    let d = {
      failedAt: o,
      failures: i !== undefined && isWithinFailureBackoff(i, o) ? i.failures + 1 : 1,
      ...(a && {
        timedOut: a,
      }),
    };
    await n.mkdir(modelCatalogCacheDir());
    await n.atomicWrite(s, jsonStringify(d), 384);
  } catch (error) {
    if (!isENOENT(error))
      logForDebugging(
        `[servedCatalog] headless retry marker write failed: ${getErrnoCode(error) ?? "unknown"}`,
      );
  }
}
//@ chunk-c0w5a81j.js:6823-7136 placement
/**
 * 服务端目录刷新结束后（每次只处理一次）按结果更新重试标记：错误/跳过时退避或尽快重试，成功时若缓存已过期则退避否则清除。
 */
async function settleServedRefresh(e, r) {
  let servedCatalogSettledRefreshes = getProviderState().servedCatalogSettledRefreshes;
  if (servedCatalogSettledRefreshes.has(r)) return;
  switch ((servedCatalogSettledRefreshes.add(r), r.fetchStatus)) {
    case "error":
    case "skipped":
      await writeRetryMarker(e, isInitialTimeoutFailure(r) ? "retry_soon" : "back_off");
      return;
    case "ok":
    case "empty":
    case "not_modified":
      await writeRetryMarker(e, r.entry === undefined || isCatalogCacheStale(r.entry) ? "back_off" : "clear");
      return;
    default:
      return;
  }
}
//@ chunk-c0w5a81j.js:7136-7219 placement
function isInitialTimeoutFailure(e) {
  return e.prior === undefined && e.fetchStatus === "error" && !isRefusalReason(e.fetchReason);
}
//@ chunk-c0w5a81j.js:7219-7531 placement
/**
 * 已发布目录刷新结束后按结果更新重试标记（超时或耗时过长时标记 timedOut）：错误/拒绝时退避，成功时视缓存是否过期退避或清除。
 */
async function settlePublishedRefresh(e, r, o = markPublishedRefreshSettled(r)) {
  if (!o) return;
  let a = r.fetchReason === "timeout" || (r.fetchMs ?? 0) >= SLOW_FETCH_THRESHOLD_MS;
  switch (r.fetchStatus) {
    case "error":
    case "rejected":
      await writeRetryMarker(e, "back_off", Date.now(), a);
      return;
    case "ok":
    case "not_modified":
      await writeRetryMarker(
        e,
        r.entry === undefined || isCacheEntryStale(r.entry) ? "back_off" : "clear",
        Date.now(),
        a,
      );
      return;
    default:
      return;
  }
}
//@ chunk-c0w5a81j.js:7531-7629 placement
function markPublishedRefreshSettled(e) {
  let publishedCatalogSettledRefreshes = getProviderState().publishedCatalogSettledRefreshes;
  if (publishedCatalogSettledRefreshes.has(e)) return false;
  publishedCatalogSettledRefreshes.add(e);
  return true;
}
//@ chunk-c0w5a81j.js:7629-7970 placement
/**
 * 按（作用域, 入口）合并并发的服务端目录刷新请求；目录关闭或无作用域时直接返回 off 结果。
 */
function refreshServedCatalogOnce({ allowNetwork }) {
  let r = servedCatalogMode();
  let o = catalogSurface();
  let a = catalogScope();
  if (r === "off" || a === null)
    return Promise.resolve({
      mode: "off",
      surface: o,
      fetchStatus: "off",
      entry: undefined,
      prior: undefined,
    });
  let servedCatalogRefreshes = getProviderState().servedCatalogRefreshes;
  let s = catalogCacheKey(a, o);
  let i = servedCatalogRefreshes.get(s);
  if (i) return i;
  let d = refreshServedCatalog({
    mode: r,
    surface: o,
    scope: a,
    allowNetwork,
  }).finally(() => {
    servedCatalogRefreshes.delete(s);
  });
  servedCatalogRefreshes.set(s, d);
  return d;
}
//@ chunk-c0w5a81j.js:7970-9657 placement
async function refreshServedCatalog({ mode, surface, scope, allowNetwork }) {
  let n;
  let s;
  let route = catalogEndpointForScope(scope);
  let credential = catalogAuthKind(scope);
  let h = (S) => ({
    mode,
    surface,
    route,
    credential,
    ...(S?.resolution !== undefined && {
      resolution: S.resolution,
    }),
    prior: n,
    ...(s !== undefined && {
      fetchMs: s,
    }),
  });
  let u = () => h(n);
  try {
    n = await loadCachedCatalog(scope, surface);
    if (n && !isCatalogCacheStale(n))
      return {
        ...u(),
        fetchStatus: "cache_fresh",
        entry: n,
      };
    if (!allowNetwork)
      return {
        ...u(),
        fetchStatus: "cache_only",
        entry: n,
      };
    let servedCatalogRefusal = getProviderState().servedCatalogRefusal;
    if (servedCatalogRefusal !== undefined)
      return {
        ...u(),
        fetchStatus: "cache_only",
        fetchReason: servedCatalogRefusal,
        entry: n,
      };
    let startTime = performance.now();
    let servedCatalog = await fetchServedCatalogOnce(scope, surface, {
      etag: n?.etag,
    });
    s = Math.round(performance.now() - startTime);
    if (!isSameCatalogScope(catalogScope(), scope)) {
      logForDebugging("[servedCatalog] scope changed during fetch; answer dropped");
      return {
        ...u(),
        fetchStatus: "error",
        fetchReason: "scope_changed",
        entry: undefined,
      };
    }
    switch (servedCatalog.status) {
      case "ok":
      case "empty": {
        let catalogCacheEntry = buildCatalogCacheEntry({
          catalog: servedCatalog.status === "ok" ? servedCatalog.catalog : null,
          etag: servedCatalog.etag,
          organizationUuid: servedCatalog.organizationUuid,
          resolution: servedCatalog.resolution,
        });
        await saveCachedCatalog(scope, surface, catalogCacheEntry);
        if (servedCatalog.status === "ok") registerPublicIds(servedCatalog.catalog);
        return {
          ...u(),
          resolution: servedCatalog.resolution,
          fetchStatus: servedCatalog.status,
          httpStatus: servedCatalog.httpStatus,
          entry: catalogCacheEntry,
        };
      }
      case "not_modified": {
        let p = n ? withFetchTimes(n) : undefined;
        if (p) await saveCachedCatalog(scope, surface, p);
        return {
          ...u(),
          fetchStatus: "not_modified",
          httpStatus: servedCatalog.httpStatus,
          entry: p,
        };
      }
      case "skipped":
        return {
          ...u(),
          fetchStatus: "skipped",
          fetchReason: servedCatalog.reason,
          entry: n,
        };
      case "error": {
        if (isRefusalReason(servedCatalog.reason))
          getProviderState().servedCatalogRefusal = servedCatalog.reason;
        let p = n;
        if (servedCatalog.reason === "lane_unavailable" && n !== undefined) {
          logForDebugging("[servedCatalog] org-less route not enabled; cached entry discarded");
          await discardCachedCatalog(scope, surface);
          p = undefined;
        }
        return {
          ...h(p),
          fetchStatus: "error",
          fetchReason: servedCatalog.reason,
          httpStatus: servedCatalog.httpStatus,
          ...(servedCatalog.errorCode !== undefined && {
            errorCode: servedCatalog.errorCode,
          }),
          entry: p,
        };
      }
    }
  } catch (error) {
    logError(error);
    return {
      ...u(),
      fetchStatus: "error",
      fetchReason: "exception",
      entry: n,
    };
  }
}
//@ chunk-c0w5a81j.js:9657-10216 placement
async function checkCatalogKey(source) {
  if (source.trust.kind === "untrusted") return;
  let publishedCatalogCache = await readPublishedCatalogCache(source.cacheKey);
  if (publishedCatalogCache === undefined) return;
  let o = await verifySignedDocument(publishedCatalogCache, source);
  if (!o.ok) {
    if (o.reason === "unknown_key" && source.kind !== "hosted" && isManagedCatalogSourceUnverified()) {
      logForDebugging(
        "[publishedCatalog] cached document names a key this session does not hold while server-managed settings are unconfirmed; not using it this session, keeping the file",
      );
      forgetPublishedCatalogCache(source.cacheKey);
      return;
    }
    logForDebugging(`[publishedCatalog] cached document not re-established (${o.reason}); discarding`);
    await clearPublishedCatalogCache(source.cacheKey);
    return;
  }
  let entry = o.entry;
  await storePublishedCatalog(source.cacheKey, entry, {
    verified: true,
  });
  return entry;
}
//@ chunk-c0w5a81j.js:10216-10739 placement
async function verifySignedDocument(publishedCatalogCache, r) {
  let trust = r.trust;
  if (trust.kind === "untrusted")
    return {
      ok: false,
      reason: "untrusted_source",
    };
  let a = base64URLEncode(publishedCatalogCache.documentBytes);
  if (a === undefined)
    return {
      ok: false,
      reason: "undecodable_bytes",
    };
  let n = await verifyCatalogSignature_2({
    documentBytes: a,
    sidecar: publishedCatalogCache.sidecar,
    roots: trust.roots,
  });
  if (!n.ok)
    return {
      ok: false,
      reason: n.reason,
    };
  let catalogDocument = parseCatalogDocument(a);
  if (catalogDocument === undefined)
    return {
      ok: false,
      reason: "unparseable_document",
    };
  let i = await checkVersionRollback(catalogDocument, r, undefined, n.rootId);
  if (i !== undefined)
    return {
      ok: false,
      reason: i,
    };
  await recordPublishedCatalogFloor(r.cacheKey, catalogDocument);
  return {
    ok: true,
    entry: {
      ...publishedCatalogCache,
      document: catalogDocument,
      rootId: n.rootId,
      source: r.kind,
    },
  };
}
//@ chunk-c0w5a81j.js:10739-10877 placement = base64URLEncode (1)
function base64URLEncode(buffer) {
  let buffer_2 = Buffer.from(buffer, "base64");
  if (buffer_2.toString("base64") !== buffer) return;
  return buffer_2.length > 0 && buffer_2.length <= CATALOG_SCHEMA ? new Uint8Array(buffer_2) : undefined;
}
//@ chunk-c0w5a81j.js:10877-11016 placement
function parseCatalogDocument(e) {
  let r = safeParseJSON(Buffer.from(e).toString("utf8"), false);
  if (getSchemaVersion(r) !== CATALOG_SCHEMA_VERSION) return;
  let o = CatalogDocumentSchema().safeParse(r);
  return o.success ? o.data : undefined;
}
//@ chunk-c0w5a81j.js:11016-11136 placement
function getMinAcceptedVersion(e, r, o) {
  let a = e.kind === "hosted" || classifyKeySource(o) === "compiled_roots";
  return Math.max(r?.document.version ?? 0, a ? bundledCatalogVersion() : 0);
}
//@ chunk-c0w5a81j.js:11136-11285 placement
async function checkVersionRollback(e, r, o, rootId) {
  if (e.version < getMinAcceptedVersion(r, o, rootId)) return "replayed_version";
  if (e.version < (await publishedFloorVersion(r.cacheKey))) return "catalog_version_rollback";
  return;
}
//@ chunk-c0w5a81j.js:11285-11736 placement
/**
 * 按缓存键合并并发的已发布目录刷新请求；功能未开启返回 off，来源 URL 无效返回 invalid_url。
 */
function refreshPublishedCatalogOnce({ allowNetwork }) {
  let mode = catalogSourceMode();
  if (!isPublishedCatalogBlocked())
    return Promise.resolve({
      mode,
      source: undefined,
      fetchStatus: "off",
      expired: false,
      entry: undefined,
    });
  let publishedCatalogSource = resolvePublishedCatalogSource();
  if (!publishedCatalogSource.ok)
    return Promise.resolve({
      mode,
      source: undefined,
      fetchStatus: "invalid_url",
      expired: false,
      entry: undefined,
    });
  let { source } = publishedCatalogSource;
  let publishedCatalogRefreshes = getProviderState().publishedCatalogRefreshes;
  let s = publishedCatalogRefreshes.get(source.cacheKey);
  if (s) return s;
  let i = fetchPublishedCatalog({
    mode,
    source,
    allowNetwork,
  }).finally(() => {
    publishedCatalogRefreshes.delete(source.cacheKey);
  });
  publishedCatalogRefreshes.set(source.cacheKey, i);
  return i;
}
//@ chunk-c0w5a81j.js:11736-13459 placement
async function fetchPublishedCatalog({ mode, source, allowNetwork }) {
  let a;
  let n = () => ({
    mode,
    source,
    ...(a !== undefined && {
      fetchMs: a,
    }),
  });
  let s;
  let i = (d) => d !== undefined && isDocumentExpired(d.document);
  try {
    if (source.trust.kind === "untrusted") {
      logForDebugging(`[publishedCatalog] ${source.kind} source skipped: ${source.trust.reason}`);
      return {
        ...n(),
        fetchStatus: "skipped",
        fetchReason: source.trust.reason,
        expired: false,
        entry: undefined,
      };
    }
    s = await checkCatalogKey(source);
    if (s && !isCacheEntryStale(s))
      return {
        ...n(),
        fetchStatus: "cache_fresh",
        expired: false,
        entry: s,
      };
    if (s && i(s)) logForDebugging("[publishedCatalog] cached document is past its expires_at; refreshing");
    if (!allowNetwork && source.kind !== "file")
      return {
        ...n(),
        fetchStatus: "cache_only",
        expired: i(s),
        entry: s,
      };
    let startTime = performance.now();
    let publishedCatalog = await fetchPublishedCatalog_2(source, {
      etag: s?.etag,
    });
    if (source.kind !== "file") a = Math.round(performance.now() - startTime);
    switch (publishedCatalog.status) {
      case "not_modified": {
        let u = s ? withCacheTimestamps(s) : undefined;
        if (u) await writePublishedCatalogCache(source.cacheKey, u);
        return {
          ...n(),
          fetchStatus: "not_modified",
          httpStatus: publishedCatalog.httpStatus,
          expired: i(u),
          entry: u,
        };
      }
      case "error":
        return {
          ...n(),
          fetchStatus: "error",
          fetchReason: publishedCatalog.reason,
          httpStatus: publishedCatalog.httpStatus,
          expired: i(s),
          entry: s,
        };
      case "ok": {
        let u = await verifyCatalogSignature({
          source,
          cached: s,
          result: publishedCatalog,
        });
        if (!u.ok) {
          logForDebugging(
            `[publishedCatalog] document rejected: ${u.reason}; keeping ${s ? "last good document" : "nothing"}`,
          );
          return {
            ...n(),
            fetchStatus: "rejected",
            fetchReason: u.reason,
            httpStatus: publishedCatalog.httpStatus,
            expired: i(s),
            entry: s,
          };
        }
        let cacheEntry = buildCacheEntry({
          document: u.document,
          documentBytes: publishedCatalog.documentBytes,
          sidecar: publishedCatalog.sidecar,
          etag: publishedCatalog.etag,
          source: source.kind,
          rootId: u.rootId,
        });
        await writePublishedCatalogCache(source.cacheKey, cacheEntry);
        let v = i(cacheEntry);
        logForDebugging(
          `[publishedCatalog] accepted ${source.kind} document v${u.document.version} (verified by ${u.rootId})${v ? ", past its expires_at" : ""}`,
        );
        return {
          ...n(),
          fetchStatus: "ok",
          httpStatus: publishedCatalog.httpStatus,
          expired: v,
          entry: cacheEntry,
        };
      }
    }
  } catch (error) {
    logError(error);
    return {
      ...n(),
      fetchStatus: "error",
      fetchReason: "exception",
      expired: i(s),
      entry: s,
    };
  }
}
//@ chunk-c0w5a81j.js:13459-14148 placement
async function verifyCatalogSignature({ source, cached, result: o }) {
  let trust = source.trust;
  if (trust.kind === "untrusted")
    return {
      ok: false,
      reason: "unsigned",
    };
  if (!o.hasSidecar)
    return {
      ok: false,
      reason: "unsigned",
    };
  let n = await verifyCatalogSignature_2({
    documentBytes: o.documentBytes,
    sidecar: o.sidecar,
    roots: trust.roots,
  });
  if (!n.ok)
    return {
      ok: false,
      reason: n.reason,
    };
  let s = safeParseJSON(Buffer.from(o.documentBytes).toString("utf8"), false);
  let schemaVersion = getSchemaVersion(s);
  if (schemaVersion === undefined)
    return {
      ok: false,
      reason: "parse_failed",
    };
  if (schemaVersion !== CATALOG_SCHEMA_VERSION)
    return {
      ok: false,
      reason: "unsupported_schema",
    };
  let d = CatalogDocumentSchema().safeParse(s);
  if (!d.success)
    return {
      ok: false,
      reason: "parse_failed",
    };
  let h = d.data;
  let u = await checkVersionRollback(h, source, cached, n.rootId);
  if (u !== undefined) {
    await applyPublishedCatalog(h);
    return {
      ok: false,
      reason: u,
    };
  }
  await recordPublishedCatalogFloor(source.cacheKey, h);
  return {
    ok: true,
    document: h,
    rootId: n.rootId,
  };
}
//@ chunk-c0w5a81j.js:14148-14176 placement
var FETCH_BUDGET_MS = 1750;
var HEADLESS_FETCH_BUDGET_MS = 1500;
var CCR_FETCH_BUDGET_MS = 4500;
//@ chunk-c0w5a81j.js:14176-14232 placement
function fetchBudgetMs(headless) {
  if (catalogSurface() === "ccr") return CCR_FETCH_BUDGET_MS;
  return headless ? HEADLESS_FETCH_BUDGET_MS : FETCH_BUDGET_MS;
}
//@ chunk-c0w5a81j.js:14232-14244 placement
var SHORT_FETCH_BUDGET_MS = 2000;
//@ chunk-c0w5a81j.js:14244-16511 placement
async function loadCatalogCache({ headless }) {
  if (getProviderState().servedCatalogActive !== undefined) return;
  try {
    if (servedCatalogMode() !== "primary" || isServedCatalogDisabled()) {
      noopOptInDecision(headless);
      return;
    }
    let r = catalogScope();
    if (r === null) {
      applyCompiledFallback("no_scope", "no cache scope");
      return;
    }
    let o = catalogSurface();
    let cachedCatalog = await loadCachedCatalog(r, o);
    let n = "cache";
    let s;
    let i = {};
    let d;
    let h = false;
    let u;
    if (cachedCatalog === undefined) {
      let C = headless ? catalogCacheFilePath(r, o) : null;
      if (C !== null && !(await isRetryDue(C))) h = true;
      else {
        let refresh = refreshServedCatalogOnce({
          allowNetwork: true,
        });
        if (C !== null)
          refresh = refresh.then(async (A) => {
            await settleServedRefresh(C, A);
            return A;
          });
        let P = await awaitServedRefresh(refresh, {
          wait: "first_fetch",
          headless,
          budgetMs: fetchBudgetMs(headless),
          scope: r,
        });
        d = P.timing;
        u = P.outcome;
        cachedCatalog = P.outcome?.entry;
        s = P.outcome === undefined ? "timeout" : P.outcome.fetchStatus;
        i = getFetchFields(P.outcome);
        n = `fetch:${s}`;
      }
    } else if (!headless && isCatalogCacheStale(cachedCatalog)) {
      let C = await awaitServedRefresh(
        refreshServedCatalogOnce({
          allowNetwork: true,
        }),
        {
          wait: "stale_refresh",
          headless,
          budgetMs: SHORT_FETCH_BUDGET_MS,
          scope: r,
        },
      );
      d = C.timing;
      u = C.outcome;
      s = C.outcome === undefined ? "timeout" : C.outcome.fetchStatus;
      if (C.outcome?.fetchReason === "lane_unavailable") cachedCatalog = undefined;
      else {
        cachedCatalog = C.outcome?.entry ?? cachedCatalog;
        n = `stale cache: waited ${d.wait_ms}ms for refresh \u2192 ${isCatalogCacheStale(cachedCatalog) ? "kept stale" : "refreshed"} (fetch:${s})`;
      }
    }
    if (getProviderState().servedCatalogActive !== undefined || !isSameCatalogScope(catalogScope(), r))
      return;
    let catalog = cachedCatalog?.catalog ?? null;
    let resolution = cachedCatalog?.resolution ?? u?.resolution;
    let routeFields = getRouteFields(r, resolution);
    if (catalog === null) {
      if (cachedCatalog !== undefined)
        applyCompiledFallback(
          "surface_not_served",
          "server serves this surface no rows",
          {
            ...routeFields,
            ...d,
          },
          r,
        );
      else if (h)
        applyCompiledFallback(
          "headless_held_off",
          "nothing cached, and a recent headless request failed, so this run does not ask again",
          routeFields,
          r,
        );
      else if (u !== undefined && isRefusalFetchFailure(u))
        applyRefusalFallback(u, {
          headless,
          timing: d,
          lane: routeFields,
          scope: r,
        });
      else
        applyCompiledFallback(
          `${headless ? "headless_" : ""}fetch_${s ?? "none"}`,
          `nothing cached, ${n} produced no rows`,
          {
            ...routeFields,
            ...i,
            ...d,
          },
          r,
        );
      return;
    }
    if (offeredCatalogRows(catalog).length === 0) {
      applyCompiledFallback(
        activeCatalogModels_2(catalog).length === 0 ? "no_selectable_rows" : "no_offered_rows",
        `served rows hold no model this build offers (${catalogModels(catalog).length} rows via ${n})`,
        {
          ...routeFields,
          ...d,
        },
        r,
      );
      return;
    }
    let stale = cachedCatalog !== undefined && isCatalogCacheStale(cachedCatalog);
    activateServedCatalog(catalog, cachedCatalog?.fetchedAt, stale, {
      route: catalogEndpointForScope(r),
      credential: catalogAuthKind(r),
      organizationUuid: cachedCatalog?.organizationUuid,
      resolution: cachedCatalog?.resolution,
    });
    logFeatureOk("model_catalog_primary", {
      decision: fromEnum("served"),
      ...routeFields,
      ...d,
    });
    logForDebugging(
      `[servedCatalog] primary: using served rows (${catalogModels(catalog).length} rows via ${n} over the ${catalogEndpointForScope(r)} route${describeCredentialKind(catalogAuthKind(r))}, fetched ${Math.max(0, Math.round((Date.now() - (cachedCatalog?.fetchedAt ?? Date.now())) / 1000))}s ago${stale ? ", stale" : ""}); the served list replaces the compiled picker for this session`,
    );
  } catch (error) {
    logError(error);
    if (getProviderState().servedCatalogActive === undefined && servedCatalogMode() === "primary")
      applyCompiledFallback("exception", "exception");
  }
}
//@ chunk-c0w5a81j.js:16511-16533 placement
/**
 * 空实现（服务端目录钩子占位）。
 */
async function noopServedCatalogHook() {}
//@ chunk-c0w5a81j.js:16533-16556 placement
function isServedCatalogDisabled() {
  return false;
}
//@ chunk-c0w5a81j.js:16556-16572 placement
function noopOptInDecision(headless) {}
//@ chunk-c0w5a81j.js:16572-16699 placement
function getFetchFields(e) {
  let r = fromEnumOpt(e?.fetchReason);
  let httpStatus = e?.httpStatus;
  return {
    ...(r !== undefined && {
      fetch_reason: r,
    }),
    ...(httpStatus !== undefined && {
      http_status: httpStatus,
    }),
  };
}
//@ chunk-c0w5a81j.js:16699-16835 placement
function getRouteFields(e, resolution) {
  let o = catalogEndpointForScope(e);
  return {
    route: fromEnum(o),
    credential: fromEnum(catalogAuthKind(e)),
    auth_kind: fromEnum(catalogCredentialKind()),
    ...(o === "orgless" && {
      resolution: fromEnum(resolution ?? "unknown"),
    }),
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
function catalogRouteAndCredential(e) {
  return {
    route: catalogEndpointForScope(e),
    credential: catalogAuthKind(e),
  };
}
//@ chunk-c0w5a81j.js:17081-17607 placement
/**
 * 在预算时间内等待服务端目录刷新，超时则让刷新在后台继续并在结束时记录；记录等待诊断并返回结果与计时字段。
 */
async function awaitServedRefresh(refresh, options) {
  let { budgetMs } = options;
  let startTime = performance.now();
  let outcome = await withTimeout(refresh, budgetMs, `served catalog ${options.wait}`).catch(() => {
    return;
  });
  if (outcome === undefined) refresh.then((i) => logLateFetch(i, options)).catch((error) => logError(error));
  let fetchMs = outcome?.fetchMs;
  logForDiagnosticsNoPII(outcome === undefined ? "warn" : "info", "model_catalog_refresh_wait", {
    budget_ms: budgetMs,
    waited_ms: Math.round(performance.now() - startTime),
    timed_out: outcome === undefined,
    first_fetch: options.wait === "first_fetch",
  });
  return {
    outcome,
    timing: {
      wait_ms: Math.round(performance.now() - startTime),
      wait_budget_ms: budgetMs,
      wait_timed_out: outcome === undefined,
      ...(fetchMs !== undefined && {
        fetch_ms: fetchMs,
      }),
      startup_ms: Math.round(startTime),
    },
  };
}
//@ chunk-c0w5a81j.js:17607-18174 placement
/**
 * 记录等待超时后才完成的目录获取：状态、耗时、路由字段与是否写入缓存，失败记为 sad、成功记为 ok。
 */
function logLateFetch(e, { wait, headless, budgetMs, scope }) {
  let failed = e.fetchStatus === "error" || e.fetchStatus === "skipped";
  let fields = {
    wait: fromEnum(wait),
    headless,
    wait_budget_ms: budgetMs,
    ...getRouteFields(scope, e.resolution),
    ...(e.fetchMs !== undefined && {
      fetch_ms: e.fetchMs,
    }),
    fetch_status: fromEnum(e.fetchStatus),
    ...getFetchFields(e),
    cache_written:
      !failed && e.fetchStatus !== "cache_fresh" && e.fetchStatus !== "cache_only" && e.entry !== undefined,
  };
  if (failed) logFeatureSad("model_catalog_late_fetch", `fetch_${e.fetchStatus}`, fields);
  else logFeatureOk("model_catalog_late_fetch", fields);
  logForDebugging(
    `[servedCatalog] ${wait} settled after its ${budgetMs}ms wait: fetch:${e.fetchStatus}, request took ${e.fetchMs ?? "?"}ms`,
  );
}
//@ chunk-c0w5a81j.js:18174-18213 placement
function isRefusalFetchFailure(e) {
  return isRefusalReason(e.fetchReason);
}
//@ chunk-c0w5a81j.js:18213-18321 placement
var REFUSAL_OFF_REASONS = {
  not_permitted: "credential_scope",
  ip_restricted: "ip_restricted",
  lane_unavailable: "lane_unavailable",
};
//@ chunk-c0w5a81j.js:18321-18791 placement
/**
 * 服务端目录因凭据范围/IP 限制/通道不可用被拒时，切换到回退目录并记录 model_catalog_primary（off 原因、HTTP 状态、拒绝码与计时）。
 */
function applyRefusalFallback(e, { headless, timing, lane, scope }) {
  let fallbackReason = REFUSAL_OFF_REASONS[e.fetchReason];
  activateFallbackCatalog(fallbackReason, catalogRouteAndCredential(scope));
  logFeatureOk("model_catalog_primary", {
    decision: fromEnum("off"),
    off_reason: fromEnum(fallbackReason),
    ...emptyServedOverrides(fallbackReason),
    headless,
    ...lane,
    ...(e.httpStatus !== undefined && {
      http_status: e.httpStatus,
    }),
    ...(e.errorCode !== undefined && {
      refusal_code: fromEnum(e.errorCode),
    }),
    ...timing,
  });
  let i = `${e.httpStatus ?? "?"}${e.errorCode !== undefined ? ` ${e.errorCode}` : ""}`;
  logForDebugging(
    `[servedCatalog] primary: served rows unavailable (${describeRefusalReason(e.fetchReason)}: ${i}); using compiled behavior`,
  );
}
//@ chunk-c0w5a81j.js:18791-19010 placement
function applyCompiledFallback(fallbackReason, r, o, a, n) {
  activateFallbackCatalog(fallbackReason, {
    ...(a !== undefined && catalogRouteAndCredential(a)),
    ...(n !== undefined && {
      organizationUuid: n,
    }),
  });
  logFeatureSad("model_catalog_primary", fallbackReason, {
    ...emptyServedOverrides(fallbackReason),
    ...o,
  });
  logForDebugging(`[servedCatalog] primary: served rows unavailable (${r}); using compiled behavior`);
}
//@ chunk-c0w5a81j.js:19010-19034 placement
function emptyServedOverrides(e) {
  return {};
}
//@ chunk-c0w5a81j.js:19034-19053 placement
var PRIMARY_DECISION_BUDGET_MS = 2000;
var HEADLESS_PRIMARY_DECISION_BUDGET_MS = 1500;
//@ chunk-c0w5a81j.js:19053-22570 placement
/**
 * 选择主模型目录来源：已发布目录或编译内置行为（非必要流量关闭时跳过）
 */
async function resolvePrimaryCatalog({ headless }) {
  let r = {};
  try {
    let o = servedCatalogActive();
    if (o !== undefined && !isKeyAuthFallbackSource(o)) return;
    let allowNetwork = !headless || isPublishedCatalogUsable();
    let n = allowNetwork && isFirstPartyApiBackend();
    let s = !n ? 0 : headless ? HEADLESS_PRIMARY_DECISION_BUDGET_MS : PRIMARY_DECISION_BUDGET_MS;
    let i = Date.now() + s;
    let d =
      shouldWaitForPublishedCatalog() &&
      catalogSourceMode() === "primary" &&
      (await waitForRemoteSettings(i));
    let publishedCatalogBlock = getPublishedCatalogBlock();
    if (publishedCatalogBlock !== null) {
      if (d && publishedCatalogBlock === "essential_traffic") {
        logFeatureSad("model_catalog_published", "essential_traffic", buildDecisionFields(headless, r, d));
        logForDebugging(
          "[publishedCatalog] primary: nonessential traffic is disabled and the server-managed catalog source is not yet confirmed by the server; published path off this session",
        );
      }
      return;
    }
    let u = publishedCatalogBlockMode();
    let publishedCatalogSource = resolvePublishedCatalogSource();
    if (!publishedCatalogSource.ok) {
      if (u === "primary")
        applyPublishedFallback(
          publishedCatalogSource.reason,
          "configured catalog URL is unusable",
          buildDecisionFields(headless, r, d),
        );
      return;
    }
    let { source } = publishedCatalogSource;
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
    let m = catalogSurface();
    let p = await checkCatalogKey(source);
    let C = p === undefined ? "nothing cached, no request" : "cache";
    let R;
    let P = false;
    let A = n || source.kind === "file";
    let U = (headless || !n) && source.kind === "file";
    let ye = () => (U ? PRIMARY_DECISION_BUDGET_MS : Math.max(0, i - Date.now()));
    let budgetMs = U ? PRIMARY_DECISION_BUDGET_MS : s;
    let M = n && source.kind !== "file" ? publishedCatalogCachePath(source.cacheKey) : null;
    let B = p === undefined ? A : isCacheEntryStale(p) && (headless ? U : A);
    let Y = async (label) => {
      let publishedRefresh = startPublishedRefresh(M, allowNetwork);
      let Q = await awaitRefreshOutcome(publishedRefresh.refresh, {
        waitMs: ye(),
        budgetMs,
        label,
      });
      if (Q.outcome === undefined) await publishedRefresh.countSpentWait();
      return Q;
    };
    if (B && M !== null && (headless ? !(await isRetryDue(M)) : await isInRetryBackoff(M))) {
      P = true;
      r = {
        held_off: true,
      };
      if (!headless) startPublishedRefresh(M, allowNetwork).refresh.catch((error) => logError(error));
      C = `${p === undefined ? "nothing cached" : "stale cache"}, ${headless ? "no request: a recent headless request failed and its hold-off has not passed" : "not waiting: the last request timed out or failed recently, so this one runs in the background"}`;
    } else if (B && p === undefined) {
      let b = await Y("published catalog first fetch");
      p = b.outcome?.entry;
      R = b.fetchStatus;
      r = b.fields;
      C = `fetch:${R} after ${b.waitMs}ms`;
    } else if (B && p !== undefined) {
      let b = await Y("published catalog stale refresh");
      R = b.fetchStatus;
      r = b.fields;
      p = b.outcome?.entry ?? p;
      C = `stale cache: waited ${b.waitMs}ms for refresh \u2192 ${isCacheEntryStale(p) ? "kept stale" : "refreshed"} (fetch:${R})`;
    }
    if (servedCatalogActive() !== o) return;
    let J = p?.document ?? bundledCatalogDocument();
    if (J !== null && isHeldForModel(J, providerCatalogKey(getAPIProvider()))) {
      applyPublishedFallback(
        "publisher_hold",
        "the publisher holds this backend on compiled behavior",
        buildDecisionFields(headless, r, d),
      );
      return;
    }
    let { catalog, kind } = selectCatalogSource(p, m);
    if (catalog === null) {
      if (p !== undefined)
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
          allowNetwork ? "deferred_no_cache" : "headless_no_cache",
          `nothing cached, ${allowNetwork ? "a third-party launch does not wait for the fetch" : "this headless launch may not fetch"}, no seed`,
          buildDecisionFields(headless, r, d),
        );
      return;
    }
    if (kind === "seed") {
      let missingFamilyDefault = findMissingFamilyDefault(catalog);
      if (missingFamilyDefault !== null) {
        applyPublishedFallback(
          "seed_stale",
          `${C}; compiled seed resolves ${missingFamilyDefault.family} to ${missingFamilyDefault.seed}, this build to ${missingFamilyDefault.compiled}`,
          buildDecisionFields(headless, r, d),
        );
        return;
      }
      let O = isFirstPartyApiBackend() ? null : findSeedMismatch(catalog);
      if (O !== null) {
        applyPublishedFallback(
          "seed_moves_model",
          `compiled seed would move ${O.what} to ${O.seed}${O.compiled === undefined ? "" : `, this build's table says ${O.compiled}`}`,
          buildDecisionFields(headless, r, d),
        );
        return;
      }
    }
    if (offeredCatalogRows(catalog).length === 0) {
      applyPublishedFallback(
        activeCatalogModels_2(catalog).length === 0 ? "no_selectable_rows" : "no_offered_rows",
        `published rows hold no model this build offers (${catalogModels(catalog).length} rows via ${kind})`,
        buildDecisionFields(headless, r, d),
      );
      return;
    }
    let stale = p !== undefined && isCacheEntryStale(p);
    setServedCatalog(catalog, p?.fetchedAt, stale);
    if (kind === "seed")
      logFeatureSad("model_catalog_published", "seed", buildDecisionFields(headless, r, d));
    else if (d)
      logFeatureSad(
        "model_catalog_published",
        "remote_settings_unconfirmed",
        buildDecisionFields(headless, r, false),
      );
    else logFeatureOk("model_catalog_published", buildDecisionFields(headless, r, false));
    logForDebugging(
      `[publishedCatalog] primary: using ${kind} rows (${catalogModels(catalog).length} rows via ${C}${stale ? ", stale" : ""})`,
    );
  } catch (error) {
    logError(error);
    let a = servedCatalogActive();
    if ((a === undefined || isKeyAuthFallbackSource(a)) && publishedCatalogBlockMode() === "primary")
      applyPublishedFallback("exception", "exception", buildDecisionFields(headless, r, false));
  }
}
//@ chunk-c0w5a81j.js:22570-22974 placement
/**
 * 启动已发布目录刷新；有重试标记作用域时把标记更新串行化，并提供 countSpentWait 在等待耗尽而获取未完成时记一次超时退避。
 */
function startPublishedRefresh(e, allowNetwork) {
  let o = refreshPublishedCatalogOnce({
    allowNetwork,
  });
  if (e === null)
    return {
      refresh: o,
      countSpentWait: () => Promise.resolve(),
    };
  let resolved = Promise.resolve();
  let n = false;
  let s = false;
  return {
    refresh: o.then(async (h) => {
      n = true;
      let u = markPublishedRefreshSettled(h);
      resolved = resolved.then(async () => {
        if (!s || h.fetchStatus === "ok" || h.fetchStatus === "not_modified")
          await settlePublishedRefresh(e, h, u);
      });
      await resolved;
      return h;
    }),
    countSpentWait: () => {
      resolved = resolved.then(async () => {
        if (!n) {
          s = true;
          await writeRetryMarker(e, "back_off", Date.now(), true);
        }
      });
      return resolved;
    },
  };
}
//@ chunk-c0w5a81j.js:22974-23438 placement
/**
 * 在限定时间内等待刷新结果，返回结果、获取状态（超时记为 timeout）、等待毫秒数与遥测字段。
 */
async function awaitRefreshOutcome(refresh, { waitMs, budgetMs, label }) {
  let startTime = performance.now();
  let s = await withTimeout(refresh, waitMs, label).catch(() => {
    return;
  });
  let fetchStatus = s === undefined ? "timeout" : s.fetchStatus;
  let rounded = Math.round(performance.now() - startTime);
  return {
    outcome: s,
    fetchStatus,
    waitMs: rounded,
    fields: {
      fetch_status: fromEnum(fetchStatus),
      ...(s?.fetchReason !== undefined && {
        fetch_reason: fromEnum(s.fetchReason),
      }),
      ...(s?.httpStatus !== undefined && {
        http_status: s.httpStatus,
      }),
      ...(s?.fetchMs !== undefined && {
        fetch_ms: s.fetchMs,
      }),
      wait_ms: rounded,
      wait_budget_ms: budgetMs,
      wait_timed_out: s === undefined,
    },
  };
}
//@ chunk-c0w5a81j.js:23438-23838 placement
/**
 * 存在托管的模型拒绝规则时，读取（含忽略环境 URL 的）已发布目录缓存文档，供拒绝规则匹配行名使用；失败只记录日志。
 */
async function loadPublishedDenyDocuments() {
  try {
    if (getPublishedCatalogBlock() === "policy") return;
    let { hasManagedModelDenies } = await import("./chunk-d2gvw8te.js");
    if (!hasManagedModelDenies()) return;
    let r = new Set();
    let o = [];
    for (let n of [
      resolvePublishedCatalogSource({
        ignoreEnvUrl: true,
      }),
      resolvePublishedCatalogSource(),
    ]) {
      if (!n.ok || r.has(n.source.cacheKey)) continue;
      r.add(n.source.cacheKey);
      let s = await checkCatalogKey(n.source);
      if (s !== undefined) o.push(s.document);
    }
    let providerState = getProviderState();
    providerState.publishedDenyDocuments = o;
    providerState.publishedRowNames = undefined;
  } catch (error) {
    logError(error);
  }
}
//@ chunk-c0w5a81j.js:23838-24217 placement
/**
 * 比较目录给出的各族别名与 Default 目标和编译期默认值，返回第一个不一致项（族别名或 Default），全部一致返回 null。
 */
function findSeedMismatch(catalog) {
  let apiProvider = getAPIProvider();
  for (let n of [...MODEL_FAMILY_NAMES, "fable"]) {
    let familyDefault = getFamilyDefault(catalog, n);
    if (familyDefault === undefined) continue;
    let catalogAlias = resolveCatalogAlias(n, providerCatalogKey(apiProvider));
    if (
      catalogAlias === undefined ||
      modelIdentityKey(familyDefault) !== modelIdentityKey(catalogAlias) ||
      hasBoldMarker(familyDefault) !== hasBoldMarker(catalogAlias)
    )
      return {
        what: `the ${n} alias`,
        seed: familyDefault,
        compiled: catalogAlias,
      };
  }
  let o = supportsFamilyOverride() ? providerModelOverrides(catalog, "default") : {};
  let a = o.perProvider ?? o.everywhere ?? (apiProvider === "firstParty" ? catalog.state?.model : undefined);
  return a === undefined
    ? null
    : {
        what: "the Default",
        seed: a,
        compiled: undefined,
      };
}
//@ chunk-c0w5a81j.js:24217-24256 placement
function hasBoldMarker(e) {
  return /\[1m\]/i.test(e);
}
//@ chunk-c0w5a81j.js:24256-24370 placement
function selectCatalogSource(e, r) {
  if (e !== undefined)
    return {
      catalog: surfaceStateFor(e.document, r),
      kind: e.source,
    };
  return {
    catalog: bundledSurfaceState(r),
    kind: "seed",
  };
}
//@ chunk-c0w5a81j.js:24370-24712 placement
/**
 * 若服务端托管设置尚未确认，最多等待到截止时间；仍未确认则记录并返回 true（本会话不使用这些设置决定目录）。
 */
async function waitForRemoteSettings(e) {
  if (shouldWaitForRemoteSettings()) {
    let r = e - Date.now();
    if (r > 0) {
      logForDebugging(`[publishedCatalog] waiting up to ${r}ms for server-managed settings to be confirmed`);
      await waitForLoadStatus(r);
    }
  }
  if (!isManagedCatalogSourceUnverified()) return false;
  logForDebugging(
    "[publishedCatalog] server-managed settings name managed model-catalog source settings the server has not confirmed; deciding this session without them",
  );
  return true;
}
//@ chunk-c0w5a81j.js:24712-24801 placement
function shouldWaitForPublishedCatalog() {
  let publishedCatalogBlock = getPublishedCatalogBlock();
  return (
    publishedCatalogBlock === null ||
    (publishedCatalogBlock === "essential_traffic" &&
      (isUnverifiedFileCatalogSource() || getRemoteManagedSettingsSyncFromCache() === null))
  );
}
//@ chunk-c0w5a81j.js:24801-24880 placement
function shouldWaitForRemoteSettings() {
  if (
    !computeRemoteSettingsEligibility() ||
    isRemoteManagedSettingsVerified() ||
    getLastLoadStatus() !== undefined
  )
    return false;
  return isManagedCatalogSourceUnverified() || getRemoteManagedSettingsSyncFromCache() === null;
}
//@ chunk-c0w5a81j.js:24880-25020 placement
async function waitForLoadStatus(e) {
  let r = () => {};
  let promise = new Promise((resolve) => {
    r = onLastLoadStatusChanged((n) => {
      if (n !== undefined) resolve();
    });
    if (getLastLoadStatus() !== undefined) resolve();
  });
  try {
    await withDeadline(promise, e);
  } finally {
    r();
  }
}
//@ chunk-c0w5a81j.js:25020-25120 placement
function buildDecisionFields(headless, r, o) {
  return {
    auth_kind: fromEnum(catalogCredentialKind()),
    headless,
    ...r,
    ...(o && {
      remote_settings_unconfirmed: true,
    }),
  };
}
//@ chunk-c0w5a81j.js:25120-25273 placement
function applyPublishedFallback(e, r, decisionFields) {
  setServedCatalog(null);
  logFeatureSad("model_catalog_published", e, decisionFields);
  logForDebugging(`[publishedCatalog] primary: published rows unavailable (${r}); using compiled behavior`);
}
//@ chunk-c0w5a81j.js:25273-25407 placement
/**
 * 确保本会话只做一次模型目录决策，返回该决策的 Promise。
 */
function ensureCatalogDecision({ headless }) {
  let providerState = getProviderState();
  if (providerState.catalogDecision === undefined)
    providerState.catalogDecision = ensureCatalogLoaded(headless).catch((error) => logError(error));
  return providerState.catalogDecision;
}
//@ chunk-c0w5a81j.js:25407-25485 placement
async function ensureCatalogLoaded(headless) {
  await loadCatalogCache({
    headless,
  });
  await resolvePrimaryCatalog({
    headless,
  });
  await loadPublishedDenyDocuments();
}
//@ chunk-3wek6r2k.js:80328-80820 placement
async function refreshServedModelCapabilities(e, credentials) {
  if (!isModelCapabilitiesCacheEnabled()) return;
  if (isEssentialTrafficOnly()) return;
  if (isDiskless()) return;
  try {
    if (await loadFreshCapabilities(stripAnyVersatileSuffix(getMainLoopModel()), e)) {
      logForDebugging("[modelCapabilities] cached model list is recent enough, not fetching");
      return;
    }
    let anthropicClient = await getAnthropicClient({
      maxRetries: 1,
      agentContext: mainAgentContext(),
      credentials,
      storageV5: e,
    });
    let betas = isClaudeAISubscriber() ? [OAUTH_BETA_HEADER] : undefined;
    let u = [];
    for await (let p of anthropicClient.models.list({
      betas,
      limit: 1000,
    })) {
      let modelCapability = parseModelCapability(p);
      if (modelCapability) u.push(modelCapability);
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
  let enabledModelOptions = getEnabledModelOptions();
  let pickerIds = dedupeModelIds(userModelIds(enabledModelOptions));
  let basePickerIds = dedupeModelIds(
    userModelIds(enabledModelOptions.filter((enabledModelOption) => !enabledModelOption.sessionTail)),
  );
  let mainLoopModel = getMainLoopModel();
  let canonicalName = getCanonicalName(mainLoopModel);
  let modelMaxOutputTokens = getModelMaxOutputTokens(mainLoopModel);
  return {
    pickerIds,
    basePickerIds,
    defaultModel: getDefaultMainLoopModel(),
    aliasTargets: {
      opus: getDefaultOpusModel(),
      sonnet: getDefaultSonnetModel(),
      haiku: getDefaultHaikuModel(),
    },
    mainLoopModel,
    mainLoopCanonical: canonicalName,
    contextWindow: getContextWindow(mainLoopModel, getSdkBetas()),
    maxOutputTokens: modelMaxOutputTokens.upperLimit,
    defaultOutputTokens: modelMaxOutputTokens.default,
    defaultOutputTokensRequested: defaultMaxOutputTokens(mainLoopModel),
    defaultEffort: String(getDefaultEffortForModel(mainLoopModel)),
    defaultEffortPinnedAboveServed: hasAnyDefaultEffort(mainLoopModel),
    capabilities: EFFORT_CAPABILITY_KEYS.filter(
      (h) => modelDefinitelySupports(canonicalName, h, mainLoopModel) === true,
    ),
  };
}
//@ chunk-3wek6r2k.js:81293-82907 placement
/**
 * 对比服务端下发的模型目录与本地编译目录、选择器列表，得出差异。
 */
function compareServedCatalog(e, o, provenance) {
  let r = dedupeModelIds(
    selectableRowIds({
      catalog: e,
      provenance,
    }),
  );
  let pickerIds = o.pickerIds;
  let p = dedupeModelIds(
    selectableNonOverflowRowIds({
      catalog: e,
      provenance,
    }),
  );
  let basePickerIds = o.basePickerIds;
  let mapped = basePickerIds.map(stripModelDateSuffix);
  let mapped_2 = p.map(stripModelDateSuffix);
  let M = new Set(mapped);
  let E = new Set(mapped_2);
  let w = count(mapped_2, (ve) => !M.has(ve));
  let P = count(mapped, (ve) => !E.has(ve));
  let familyDefaults = getFamilyDefaults(e);
  let se = offeredCatalogRows(e);
  let modelCatalogStatus = getModelCatalogStatus(e, o.mainLoopModel);
  let ce =
    modelCatalogStatus.status === "known"
      ? [
          o.mainLoopModel,
          getCatalogState().modelKnowledge?.identitySpelling(o.mainLoopModel),
          o.mainLoopCanonical,
        ].find((ve) => ve !== undefined && findServedCatalogRow(e, ve) !== undefined)
      : undefined;
  let pe = ce === undefined ? undefined : clampInRange(getDefaultOutputTokens(e, ce), OUTPUT_TOKEN_RANGE);
  let Re =
    ce === undefined
      ? o.defaultOutputTokens
      : Math.min(
          pe ?? o.defaultOutputTokensRequested,
          clampInRange(servedMaxOutputTokensOf(e, ce), OUTPUT_TOKEN_RANGE) ?? o.maxOutputTokens,
        );
  let He = ce === undefined ? undefined : getDefaultEffort(e, ce);
  let $e = o.defaultEffortPinnedAboveServed || He === undefined ? o.defaultEffort : He;
  return {
    picker: {
      match: sameOrder(pickerIds, r),
      old: pickerIds,
      new: r,
      main: {
        match: sameOrder(mapped, mapped_2),
        setMatch: w === 0 && P === 0,
        old: basePickerIds,
        new: p,
        added: w,
        removed: P,
        overflowCount: r.length - p.length,
      },
    },
    defaultModel: compareModelIds(o.defaultModel, catalogStateModel(e)),
    aliases: {
      opus: compareModelIds(o.aliasTargets.opus, familyDefaults.opus),
      sonnet: compareModelIds(o.aliasTargets.sonnet, familyDefaults.sonnet),
      haiku: compareModelIds(o.aliasTargets.haiku, familyDefaults.haiku),
    },
    mainLoopModel: o.mainLoopModel,
    contextWindow: diffField(o.contextWindow, servedMaxInputTokensOf(e, o.mainLoopModel)),
    maxOutputTokens: diffField(o.maxOutputTokens, servedMaxOutputTokensOf(e, o.mainLoopModel)),
    defaultOutputTokens: {
      match: ce === undefined ? undefined : o.defaultOutputTokens === Re,
      old: o.defaultOutputTokens,
      new: Re,
      servedHasValue: pe !== undefined,
    },
    defaultEffort: {
      match: ce === undefined ? undefined : o.defaultEffort === $e,
      old: o.defaultEffort,
      new: $e,
      servedHasValue: He !== undefined,
    },
    mainLoopKnowledge: modelCatalogStatus,
    offeredCount: se.length,
    mappedCount: count(se, (ve) => getModelCatalogStatus(e, ve.id).status === "mapped"),
    notOfferedCount: unselectableActiveRows(e).length,
    capabilities: compareEffortCapabilities(findServedCatalogRow(e, o.mainLoopModel), o.capabilities),
    familyDefaultCount: zeroFamilyDefaultCount(e),
  };
}
//@ chunk-3wek6r2k.js:82907-83152 placement
function compareEffortCapabilities(servedCatalogRow, capabilities) {
  let capabilities_2 = servedCatalogRow?.runtime?.capabilities;
  if (capabilities_2 === undefined)
    return {
      match: undefined,
      servedCount: 0,
    };
  let r = EFFORT_CAPABILITY_KEYS;
  let u = uniq(
    capabilities_2.map((capability) => capability.trim().toLowerCase()).filter((h) => r.includes(h)),
  );
  let p = new Set(capabilities);
  return {
    match: u.every((h) => p.has(h)),
    servedCount: u.length,
  };
}
//@ chunk-3wek6r2k.js:83152-83176 placement
function zeroFamilyDefaultCount(e) {
  return 0;
}
//@ chunk-3wek6r2k.js:83176-83279 placement
function dedupeModelIds(e) {
  let o = new Set();
  let n = [];
  for (let r of e) {
    let u = normalizeModelId(r);
    if (!o.has(u)) {
      o.add(u);
      n.push(u);
    }
  }
  return n;
}
//@ chunk-3wek6r2k.js:83279-83384 placement
function compareModelIds(e, o) {
  let n = normalizeModelId(e);
  let r = o === undefined ? undefined : normalizeModelId(o);
  return {
    match: r === undefined ? undefined : n === r,
    old: n,
    new: r,
  };
}
//@ chunk-3wek6r2k.js:83384-83451 placement
function diffField(e, o) {
  return {
    match: o === undefined ? undefined : e === o,
    old: e,
    new: o,
  };
}
//@ chunk-3wek6r2k.js:83451-83533 placement
function userModelIds(e) {
  return e.flatMap((o) => (o.value === null ? [] : [o.value])).map((o) => parseUserSpecifiedModel(o));
}
//@ chunk-3wek6r2k.js:83533-83603 placement
function sameOrder(e, o) {
  return e.length === o.length && e.every((n, r) => n === o[r]);
}
//@ chunk-3wek6r2k.js:83603-83653 placement
function stripModelDateSuffix(e) {
  return normalizeModelId(e).replace(/-\d{8}$/, "");
}
//@ chunk-3wek6r2k.js:83653-83857 placement
function startServedCatalog({ allowNetwork }) {
  if (servedCatalogMode() === "off") {
    logForDebugging(`[servedCatalog] off (${servedModelCatalogEligibility() ?? "flag"})`);
    return;
  }
  let providerState = getProviderState();
  if (providerState.servedCatalogShadowStarted) return;
  providerState.servedCatalogShadowStarted = true;
  loadServedCatalog(allowNetwork).catch((error) => logError(error));
}
//@ chunk-3wek6r2k.js:83857-84544 placement
async function loadServedCatalog(allowNetwork) {
  let o = catalogScope();
  let n = catalogSurface();
  let r = allowNetwork && isPlainNonInteractive() && o !== null ? catalogCacheFilePath(o, n) : null;
  let u = allowNetwork && (r === null || (await isRetryDue(r)));
  let p = await refreshServedCatalogOnce({
    allowNetwork: u,
  });
  if (p.mode === "off") return;
  if (r !== null && u) await settleServedRefresh(r, p);
  let catalog = p.entry?.catalog ?? null;
  let S = p.fetchStatus !== "cache_fresh" && p.fetchStatus !== "cache_only";
  if (catalog === null && !S && (isPlainNonInteractive() || !allowNetwork)) return;
  let y = null;
  let compareFailed = false;
  if (catalog !== null)
    try {
      y = compareServedCatalog(catalog, withCatalogSuppressed(pickerSnapshot), "served");
    } catch (error) {
      compareFailed = true;
      logError(error);
    }
  logEvent(
    "tengu_model_catalog_compare",
    logServedCatalogOutcome({
      outcome: p,
      catalog,
      comparison: y,
      compareFailed,
      catalogSource: servedCatalogSource(),
    }),
  );
  logForDebugging(
    `[servedCatalog] shadow compare logged (fetch=${p.fetchStatus}, rows=${catalog === null ? 0 : catalogModels(catalog).length}, source=${servedCatalogSource() ?? "compiled"})`,
  );
  reconcileServedModels(
    y,
    hiddenIdsForOutcome({
      catalog,
      prior: p.prior,
      sessionMaskedIds: getMaskedModelIds(),
    }),
  );
}
//@ chunk-3wek6r2k.js:84544-84940 placement
function reconcileServedModels(e, o) {
  let n = activeServedCatalog();
  if (e === null || n === null) return;
  let r = new Set(activeCatalogModelIds(n).map((p) => firstPartyNameToCanonical(normalizeModelId(p))));
  let mapped = e.picker.old
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
function collectHiddenModelIds({ catalog, prior, sessionMaskedIds }) {
  let catalog_2 = prior?.catalog ?? null;
  return new Set([
    ...(catalog === null ? [] : getHiddenModelIds(catalog)),
    ...(catalog_2 === null || catalog_2 === catalog ? [] : getHiddenModelIds(catalog_2)),
    ...sessionMaskedIds,
  ]);
}
//@ chunk-3wek6r2k.js:85202-85273 placement
function hiddenIdsForOutcome(e) {
  return hiddenIdPredicate([e.catalog, e.prior?.catalog ?? null], () => collectHiddenModelIds(e));
}
//@ chunk-3wek6r2k.js:85273-85365 placement
function hiddenIdPredicate(e, o) {
  if (e.some((r) => r !== null && hasDroppedUnidentifiedRows(r))) return () => true;
  let n = o();
  return (r) => isHiddenOrMasked(r, n);
}
//@ chunk-3wek6r2k.js:85365-86303 placement
function logServedCatalogOutcome({
  outcome,
  catalog,
  comparison,
  compareFailed,
  catalogSource,
  authKind = catalogCredentialKind(),
  sessionMaskedIds = getMaskedModelIds(),
  now = Date.now(),
}) {
  let y = hiddenIdsForOutcome({
    catalog,
    prior: outcome.prior,
    sessionMaskedIds,
  });
  let entry = outcome.entry;
  let selectionSource = catalog?.state?.selection_source;
  return {
    mode: fromEnum(outcome.mode),
    surface: fromEnum(outcome.surface),
    catalog_source: fromEnumOpt(catalogSource),
    route: fromEnumOpt(outcome.route),
    credential: fromEnumOpt(outcome.credential),
    auth_kind: fromEnum(authKind),
    resolution: outcome.route === "orgless" ? fromEnum(outcome.resolution ?? "unknown") : undefined,
    fetch_status: fromEnum(outcome.fetchStatus),
    fetch_reason: fromEnumOpt(outcome.fetchReason),
    http_status: outcome.httpStatus,
    fetch_ms: outcome.fetchMs,
    cache_age_s: entry === undefined ? undefined : Math.max(0, Math.round((now - entry.fetchedAt) / 1000)),
    served: catalog !== null,
    served_row_count: catalog === null ? 0 : catalogModels(catalog).length,
    served_selectable_count: catalog === null ? 0 : activeCatalogModels_2(catalog).length,
    served_confidential_count: catalog === null ? 0 : confidentialModelIds(catalog).size,
    served_has_default: catalog?.state?.model !== undefined,
    served_has_runtime: catalog !== null && catalogHasRuntime(catalog),
    selection_source:
      selectionSource === undefined
        ? undefined
        : (fromEnumOpt(DEFAULT_MODEL_SOURCES.find((w) => w === selectionSource)) ?? lit("other")),
    compare_failed: compareFailed,
    ...catalogTelemetryFields(comparison, y),
  };
}
//@ chunk-3wek6r2k.js:86303-88115 placement
function catalogTelemetryFields(e, o) {
  if (e === null) return {};
  let mainLoopKnowledge = e.mainLoopKnowledge;
  let main = e.picker.main;
  return {
    main_loop_model: telemetryModelLabel(e.mainLoopModel, o),
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
      picker_old: telemetryModelList(e.picker.old, o),
      picker_new: telemetryModelList(e.picker.new, o),
      picker_old_count: e.picker.old.length,
      picker_new_count: e.picker.new.length,
    }),
    ...(!main.match && {
      picker_base_old: telemetryModelList(main.old, o),
      picker_main_new: telemetryModelList(main.new, o),
      picker_base_old_count: main.old.length,
      picker_main_new_count: main.new.length,
    }),
    ...diffFields("default", e.defaultModel, o),
    ...diffFields("opus", e.aliases.opus, o),
    ...diffFields("sonnet", e.aliases.sonnet, o),
    ...diffFields("haiku", e.aliases.haiku, o),
    ...diffTelemetryFields("context_window", e.contextWindow),
    ...diffTelemetryFields("max_output", e.maxOutputTokens),
    ...diffTelemetryFields("default_output", e.defaultOutputTokens),
    ...(e.defaultEffort.match === false && {
      default_effort_old: effortTelemetryLabel(e.defaultEffort.old),
      default_effort_new: effortTelemetryLabel(e.defaultEffort.new),
    }),
  };
}
//@ chunk-3wek6r2k.js:88115-88125 placement
var MAX_TELEMETRY_MODEL_IDS = 50;
//@ chunk-3wek6r2k.js:88125-88186 placement
function telemetryModelLabel(e, o) {
  return o(e) ? lit(CONFIDENTIAL_MODEL_ID) : (telemetrySafeModelName(e) ?? lit("nonconforming"));
}
//@ chunk-3wek6r2k.js:88186-88240 placement
function telemetryModelList(old, o) {
  return telemetrySafeModelList(
    old.map((n) => (o(n) ? CONFIDENTIAL_MODEL_ID : n)),
    MAX_TELEMETRY_MODEL_IDS,
  );
}
//@ chunk-3wek6r2k.js:88240-88282 placement
function isHiddenOrMasked(e, o) {
  return containsMaskedId(e, o) || !maskModelIdCached(e);
}
//@ chunk-3wek6r2k.js:88282-88406 placement
function diffFields(e, o, n) {
  if (o.match !== false) return {};
  return {
    [`${e}_old`]: telemetryModelLabel(o.old, n),
    [`${e}_new`]: o.new === undefined ? undefined : telemetryModelLabel(o.new, n),
  };
}
//@ chunk-3wek6r2k.js:88406-88494 placement
function diffTelemetryFields(e, o) {
  if (o.match !== false) return {};
  return {
    [`${e}_old`]: o.old,
    [`${e}_new`]: o.new,
  };
}
//@ chunk-3wek6r2k.js:88494-88589 placement
function effortTelemetryLabel(e) {
  if (isEffortLevel(e)) return fromEnum(e);
  let o = Number(e);
  return Number.isFinite(o) ? fromNumber(o) : lit("other");
}
//@ chunk-3wek6r2k.js:88589-88776 placement
function startServedCatalogShadow({ allowNetwork }) {
  if (!isPublishedCatalogBlocked()) return;
  let providerState = getProviderState();
  if (providerState.servedCatalogShadowStarted) {
    if (allowNetwork && isPlainNonInteractive())
      fetchServedCatalog(allowNetwork).catch((error) => logError(error));
    return;
  }
  providerState.servedCatalogShadowStarted = true;
  applyServedCatalog(allowNetwork).catch((error) => logError(error));
}
//@ chunk-3wek6r2k.js:88776-88815 placement
function shouldFetchServedCatalog() {
  return !getIsNonInteractiveSession() || (isPlainNonInteractive() && isPublishedCatalogUsable());
}
//@ chunk-3wek6r2k.js:88815-89087 placement
async function fetchServedCatalog(e) {
  let o = isPlainNonInteractive();
  let n = o || (isFirstPartyApiBackend() && publishedCatalogBlockMode() === "primary");
  let publishedCatalogSource = resolvePublishedCatalogSource();
  let u =
    e &&
    n &&
    publishedCatalogSource.ok &&
    publishedCatalogSource.source.kind !== "file" &&
    publishedCatalogSource.source.trust.kind !== "untrusted"
      ? publishedCatalogCachePath(publishedCatalogSource.source.cacheKey)
      : null;
  let p = e && (u === null || !o || (await isRetryDue(u)));
  let h = await refreshPublishedCatalogOnce({
    allowNetwork: p,
  });
  if (u !== null && p) await settlePublishedRefresh(u, h);
  return h;
}
//@ chunk-3wek6r2k.js:89087-89725 placement
async function applyServedCatalog(allowNetwork) {
  let servedCatalog = await fetchServedCatalog(allowNetwork);
  if (servedCatalog.fetchStatus === "off") return;
  let n = catalogSurface();
  let r = servedCatalog.entry === undefined ? null : surfaceStateFor(servedCatalog.entry.document, n);
  let u =
    servedCatalog.source?.kind !== "file" &&
    (servedCatalog.fetchStatus === "ok" ||
      servedCatalog.fetchStatus === "not_modified" ||
      servedCatalog.fetchStatus === "error" ||
      servedCatalog.fetchStatus === "rejected");
  if (r === null && !u && (isPlainNonInteractive() || !allowNetwork)) return;
  let comparison = null;
  let compareFailed = false;
  if (r !== null)
    try {
      comparison = compareServedCatalog(r, withCatalogSuppressed(pickerSnapshot), "published");
    } catch (error) {
      compareFailed = true;
      logError(error);
    }
  logEvent(
    "tengu_model_catalog_compare",
    servedCatalogDiagnostics({
      outcome: servedCatalog,
      catalog: r,
      comparison,
      compareFailed,
      catalogSource: servedCatalogSource(),
      activeCatalog: activeServedCatalog(),
    }),
  );
  logForDebugging(
    `[publishedCatalog] shadow compare logged (fetch=${servedCatalog.fetchStatus}, rows=${r === null ? 0 : catalogModels(r).length}, source=${servedCatalogSource() ?? "compiled"})`,
  );
}
//@ chunk-3wek6r2k.js:89725-90632 placement
function servedCatalogDiagnostics({
  outcome,
  catalog,
  comparison,
  compareFailed,
  catalogSource,
  activeCatalog = null,
  authKind = catalogCredentialKind(),
  sessionMaskedIds = getMaskedModelIds(),
  now = Date.now(),
}) {
  let M = hiddenIdPredicate(
    [catalog, activeCatalog],
    () =>
      new Set([
        ...(catalog === null ? [] : getHiddenModelIds(catalog)),
        ...(activeCatalog === null || activeCatalog === catalog ? [] : getHiddenModelIds(activeCatalog)),
        ...sessionMaskedIds,
      ]),
  );
  let entry = outcome.entry;
  let w = entry?.document;
  let P = classifyKeySource(entry?.rootId);
  return {
    mode: fromEnum(outcome.mode),
    surface: fromEnum(catalogSurface()),
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
    published_age_s:
      entry === undefined ? undefined : Math.max(0, Math.round((now - entry.fetchedAt) / 1000)),
    served: catalog !== null,
    served_row_count: catalog === null ? 0 : catalogModels(catalog).length,
    served_selectable_count: catalog === null ? 0 : activeCatalogModels_2(catalog).length,
    served_has_default: catalog?.state?.model !== undefined,
    served_has_runtime: catalog !== null && catalogHasRuntime(catalog),
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
  DEFAULT_OUTPUT_TOKENS,
  classifyRefusal,
  formatRefusalSuffix,
  validEtagOrUndefined,
  parseCatalogResolution,
  formatResolutionSuffix,
  responseData,
  noopServedCatalogHook,
};
