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
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-c0w5a81j.js:1151-1219 placement
/**
 * 默认输出 token 数与"拒绝原因"枚举（未授权、IP 受限、通道不可用）。
 */
var DEFAULT_OUTPUT_TOKENS = 5000;
var REFUSAL_REASONS = ["not_permitted", "ip_restricted", "lane_unavailable"];
//@ chunk-c0w5a81j.js:1219-1260 placement
function isRefusalReason(reason) {
  return REFUSAL_REASONS.some((candidate) => candidate === reason);
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
function parseCatalogResolution(input) {
  let lower = normalizeUuidOrNull(input.organization_uuid)?.toLowerCase();
  let found = ACCOUNT_KIND_VALUES.find((value) => value === input.resolution);
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
function formatResolutionSuffix(info) {
  return info.resolution === undefined ? "" : ` (resolution ${info.resolution})`;
}
//@ chunk-c0w5a81j.js:3857-4033 placement
var CREDENTIAL_SCOPE_CODES = ["oauth_scope_insufficient", "oauth_token_narrowed"];
var IP_NOT_IN_ALLOWED_RANGE = "ip_not_in_allowed_range";
var LANE_UNAVAILABLE_CODES = ["not_found", "account_session_invalid", "organization_not_visible"];
var KNOWN_REFUSAL_CODES = [...CREDENTIAL_SCOPE_CODES, IP_NOT_IN_ALLOWED_RANGE, ...LANE_UNAVAILABLE_CODES];
//@ chunk-c0w5a81j.js:4033-4088 placement
function firstMatchingCode(codes, error) {
  let errorCode = getErrorCode(error);
  return codes.find((code) => code === errorCode);
}
//@ chunk-c0w5a81j.js:4088-4141 placement
/**
 * 依次尝试各原因分类器，给出目录拒绝原因。
 */
function classifyRefusal(scope, httpStatus, error) {
  return (
    matchScopeRefusal(httpStatus, error) ??
    matchIpRefusal(httpStatus, error) ??
    matchLaneRefusal(scope, httpStatus, error)
  );
}
//@ chunk-c0w5a81j.js:4141-4263 placement
/**
 * 生成服务端目录拒绝的后缀说明（错误码与原因）。
 */
function formatRefusalSuffix(refusal) {
  if (refusal === undefined || !isRefusalReason(refusal.reason)) return "";
  return `${refusal.errorCode !== undefined ? ` ${refusal.errorCode}` : ""} (${describeRefusalReason(refusal.reason)})`;
}
//@ chunk-c0w5a81j.js:4263-4535 placement
function describeRefusalReason(reason) {
  switch (reason) {
    case "not_permitted":
      return "this credential cannot read the served list";
    case "ip_restricted":
      return "the organization's IP allowlist refuses this network";
    case "lane_unavailable":
      return "the server has not enabled the org-less route for this session";
  }
}
//@ chunk-c0w5a81j.js:4535-4668 placement
function matchScopeRefusal(httpStatus, error) {
  let code = firstMatchingCode(CREDENTIAL_SCOPE_CODES, error);
  if (httpStatus === 403 && code !== undefined)
    return {
      status: "error",
      reason: "not_permitted",
      httpStatus,
      errorCode: code,
    };
  return;
}
//@ chunk-c0w5a81j.js:4668-4785 placement
function matchIpRefusal(httpStatus, error) {
  if (httpStatus === 403 && getErrorCode(error) === IP_NOT_IN_ALLOWED_RANGE)
    return {
      status: "error",
      reason: "ip_restricted",
      httpStatus,
      errorCode: IP_NOT_IN_ALLOWED_RANGE,
    };
  return;
}
//@ chunk-c0w5a81j.js:4785-5058 placement
function matchLaneRefusal(scope, httpStatus, error) {
  if (catalogEndpointForScope(scope) !== "orgless") return;
  let code = firstMatchingCode(LANE_UNAVAILABLE_CODES, error);
  if (
    httpStatus === 404 ||
    (httpStatus === 403 && code === "account_session_invalid") ||
    (httpStatus === 401 && code === "organization_not_visible" && catalogAuthKind(scope) === "profile")
  )
    return {
      status: "error",
      reason: "lane_unavailable",
      httpStatus,
      ...(code !== undefined && {
        errorCode: code,
      }),
    };
  return;
}
//@ chunk-c0w5a81j.js:5058-5173 placement
function getErrorCode(error) {
  let prop = getProp(error, "error");
  let prop_2 = getProp(getProp(prop, "details"), "error_code");
  return typeof prop_2 === "string" && prop_2.length > 0 ? prop_2 : undefined;
}
//@ chunk-c0w5a81j.js:5173-5246 placement
function getProp(prop, key) {
  return typeof prop === "object" && prop !== null && key in prop ? prop[key] : undefined;
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
var RETRY_BASE_MS; // deferred: uses CACHE_VERSION (../../services/modelCatalog/servedCatalog.js) of its import cycle while loading; runs once the cycle is complete
var RETRY_CAP_MS;
var SLOW_FETCH_THRESHOLD_MS;
var FAILED_MARKER_READ_BYTES;
deferInit("chunk-c0w5a81j.js:5345", () => {
  RETRY_BASE_MS = 30000;
  RETRY_CAP_MS = CACHE_TTL_MS;
  SLOW_FETCH_THRESHOLD_MS = 2000;
  FAILED_MARKER_READ_BYTES = 256;
});
//@ chunk-c0w5a81j.js:5380-5451 placement
function headlessFailedMarkerPath(cachePath) {
  return `${cachePath.replace(/\.json$/, "")}.headless-failed.json`;
}
//@ chunk-c0w5a81j.js:5451-5502 placement
function jitteredBackoff(failures, random = Math.random()) {
  return jitteredTtl(backoffDelayMs(failures), random);
}
//@ chunk-c0w5a81j.js:5502-5561 placement
function backoffDelayMs(failures) {
  return Math.min(RETRY_BASE_MS * 2 ** (Math.max(1, failures) - 1), RETRY_CAP_MS);
}
//@ chunk-c0w5a81j.js:5561-5597 placement
function backoffWithSlack(failures) {
  return backoffDelayMs(failures) * (1 + STALE_JITTER_RATIO);
}
//@ chunk-c0w5a81j.js:5597-5740 placement
async function isRetryDue(cachePath, now = Date.now(), random = Math.random()) {
  let retryMarker = await readRetryMarker(cachePath);
  if (retryMarker === undefined || retryMarker.failedAt > now) return true;
  return now - retryMarker.failedAt >= jitteredBackoff(retryMarker.failures, random);
}
//@ chunk-c0w5a81j.js:5740-5893 placement
async function isInRetryBackoff(cachePath, now = Date.now(), random = Math.random()) {
  let retryMarker = await readRetryMarker(cachePath);
  if (retryMarker === undefined || retryMarker.failedAt > now) return false;
  return retryMarker.timedOut || now - retryMarker.failedAt < jitteredBackoff(retryMarker.failures, random);
}
//@ chunk-c0w5a81j.js:5893-6385 placement
/**
 * 读取无头模式下服务端目录获取的重试标记文件（大小有上限），解析出失败时间、连续失败次数与是否超时；不存在或格式不对返回 undefined。
 */
async function readRetryMarker(cachePath) {
  let text;
  try {
    text = (
      await maskStorage().readRange(headlessFailedMarkerPath(cachePath), 0, FAILED_MARKER_READ_BYTES)
    ).toString("utf8");
  } catch (error) {
    if (!isENOENT(error))
      logForDebugging(
        `[servedCatalog] headless retry marker read failed: ${getErrnoCode(error) ?? "unknown"}`,
      );
    return;
  }
  let parsed = safeParseJSON(text, false);
  if (typeof parsed !== "object" || parsed === null) return;
  let failedAt = "failedAt" in parsed ? parsed.failedAt : undefined;
  if (typeof failedAt !== "number" || !Number.isFinite(failedAt)) return;
  let failures = "failures" in parsed ? parsed.failures : undefined;
  return {
    failedAt,
    failures: typeof failures === "number" && Number.isSafeInteger(failures) && failures >= 1 ? failures : 1,
    timedOut: "timedOut" in parsed && parsed.timedOut === true,
  };
}
//@ chunk-c0w5a81j.js:6385-6455 placement
function isWithinFailureBackoff(marker, now) {
  return marker.failedAt <= now && now - marker.failedAt < backoffWithSlack(marker.failures) + RETRY_CAP_MS;
}
//@ chunk-c0w5a81j.js:6455-6823 placement
/**
 * 写入或清除重试标记：clear 删除文件；back_off 在上次失败基础上累加失败次数，retry_soon 重置为 1；以 0600 权限原子写入。
 */
async function writeRetryMarker(cachePath, mode, now = Date.now(), timedOut = false) {
  let storage = maskStorage();
  let path = headlessFailedMarkerPath(cachePath);
  try {
    if (mode === "clear") {
      await storage.delete(path);
      return;
    }
    let previous = mode === "back_off" ? await readRetryMarker(cachePath) : undefined;
    let marker = {
      failedAt: now,
      failures: previous !== undefined && isWithinFailureBackoff(previous, now) ? previous.failures + 1 : 1,
      ...(timedOut && {
        timedOut,
      }),
    };
    await storage.mkdir(modelCatalogCacheDir());
    await storage.atomicWrite(path, jsonStringify(marker), 384);
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
async function settleServedRefresh(cachePath, result) {
  let servedCatalogSettledRefreshes = getProviderState().servedCatalogSettledRefreshes;
  if (servedCatalogSettledRefreshes.has(result)) return;
  switch ((servedCatalogSettledRefreshes.add(result), result.fetchStatus)) {
    case "error":
    case "skipped":
      await writeRetryMarker(cachePath, isInitialTimeoutFailure(result) ? "retry_soon" : "back_off");
      return;
    case "ok":
    case "empty":
    case "not_modified":
      await writeRetryMarker(
        cachePath,
        result.entry === undefined || isCatalogCacheStale(result.entry) ? "back_off" : "clear",
      );
      return;
    default:
      return;
  }
}
//@ chunk-c0w5a81j.js:7136-7219 placement
function isInitialTimeoutFailure(result) {
  return result.prior === undefined && result.fetchStatus === "error" && !isRefusalReason(result.fetchReason);
}
//@ chunk-c0w5a81j.js:7219-7531 placement
/**
 * 已发布目录刷新结束后按结果更新重试标记（超时或耗时过长时标记 timedOut）：错误/拒绝时退避，成功时视缓存是否过期退避或清除。
 */
async function settlePublishedRefresh(cachePath, result, firstSettle = markPublishedRefreshSettled(result)) {
  if (!firstSettle) return;
  let slowOrTimeout = result.fetchReason === "timeout" || (result.fetchMs ?? 0) >= SLOW_FETCH_THRESHOLD_MS;
  switch (result.fetchStatus) {
    case "error":
    case "rejected":
      await writeRetryMarker(cachePath, "back_off", Date.now(), slowOrTimeout);
      return;
    case "ok":
    case "not_modified":
      await writeRetryMarker(
        cachePath,
        result.entry === undefined || isCacheEntryStale(result.entry) ? "back_off" : "clear",
        Date.now(),
        slowOrTimeout,
      );
      return;
    default:
      return;
  }
}
//@ chunk-c0w5a81j.js:7531-7629 placement
function markPublishedRefreshSettled(result) {
  let publishedCatalogSettledRefreshes = getProviderState().publishedCatalogSettledRefreshes;
  if (publishedCatalogSettledRefreshes.has(result)) return false;
  publishedCatalogSettledRefreshes.add(result);
  return true;
}
//@ chunk-c0w5a81j.js:7629-7970 placement
/**
 * 按（作用域, 入口）合并并发的服务端目录刷新请求；目录关闭或无作用域时直接返回 off 结果。
 */
function refreshServedCatalogOnce({ allowNetwork }) {
  let mode = servedCatalogMode();
  let surface = catalogSurface();
  let scope = catalogScope();
  if (mode === "off" || scope === null)
    return Promise.resolve({
      mode: "off",
      surface,
      fetchStatus: "off",
      entry: undefined,
      prior: undefined,
    });
  let servedCatalogRefreshes = getProviderState().servedCatalogRefreshes;
  let key = catalogCacheKey(scope, surface);
  let pending = servedCatalogRefreshes.get(key);
  if (pending) return pending;
  let refresh = refreshServedCatalog({
    mode,
    surface,
    scope,
    allowNetwork,
  }).finally(() => {
    servedCatalogRefreshes.delete(key);
  });
  servedCatalogRefreshes.set(key, refresh);
  return refresh;
}
//@ chunk-c0w5a81j.js:7970-9657 placement
async function refreshServedCatalog({ mode, surface, scope, allowNetwork }) {
  let cached;
  let fetchMs;
  let route = catalogEndpointForScope(scope);
  let credential = catalogAuthKind(scope);
  let withCommon = (extra) => ({
    mode,
    surface,
    route,
    credential,
    ...(extra?.resolution !== undefined && {
      resolution: extra.resolution,
    }),
    prior: cached,
    ...(fetchMs !== undefined && {
      fetchMs,
    }),
  });
  let common = () => withCommon(cached);
  try {
    cached = await loadCachedCatalog(scope, surface);
    if (cached && !isCatalogCacheStale(cached))
      return {
        ...common(),
        fetchStatus: "cache_fresh",
        entry: cached,
      };
    if (!allowNetwork)
      return {
        ...common(),
        fetchStatus: "cache_only",
        entry: cached,
      };
    let servedCatalogRefusal = getProviderState().servedCatalogRefusal;
    if (servedCatalogRefusal !== undefined)
      return {
        ...common(),
        fetchStatus: "cache_only",
        fetchReason: servedCatalogRefusal,
        entry: cached,
      };
    let startTime = performance.now();
    let servedCatalog = await fetchServedCatalogOnce(scope, surface, {
      etag: cached?.etag,
    });
    fetchMs = Math.round(performance.now() - startTime);
    if (!isSameCatalogScope(catalogScope(), scope)) {
      logForDebugging("[servedCatalog] scope changed during fetch; answer dropped");
      return {
        ...common(),
        fetchStatus: "error",
        fetchReason: "scope_changed",
        entry: undefined,
      };
    }
    switch (servedCatalog.status) {
      case "ok":
      case "empty": {
        let entry = buildCatalogCacheEntry({
          catalog: servedCatalog.status === "ok" ? servedCatalog.catalog : null,
          etag: servedCatalog.etag,
          organizationUuid: servedCatalog.organizationUuid,
          resolution: servedCatalog.resolution,
        });
        await saveCachedCatalog(scope, surface, entry);
        if (servedCatalog.status === "ok") registerPublicIds(servedCatalog.catalog);
        return {
          ...common(),
          resolution: servedCatalog.resolution,
          fetchStatus: servedCatalog.status,
          httpStatus: servedCatalog.httpStatus,
          entry,
        };
      }
      case "not_modified": {
        let nextEntry = cached ? withFetchTimes(cached) : undefined;
        if (nextEntry) await saveCachedCatalog(scope, surface, nextEntry);
        return {
          ...common(),
          fetchStatus: "not_modified",
          httpStatus: servedCatalog.httpStatus,
          entry: nextEntry,
        };
      }
      case "skipped":
        return {
          ...common(),
          fetchStatus: "skipped",
          fetchReason: servedCatalog.reason,
          entry: cached,
        };
      case "error": {
        if (isRefusalReason(servedCatalog.reason))
          getProviderState().servedCatalogRefusal = servedCatalog.reason;
        let keptEntry = cached;
        if (servedCatalog.reason === "lane_unavailable" && cached !== undefined) {
          logForDebugging("[servedCatalog] org-less route not enabled; cached entry discarded");
          await discardCachedCatalog(scope, surface);
          keptEntry = undefined;
        }
        return {
          ...withCommon(keptEntry),
          fetchStatus: "error",
          fetchReason: servedCatalog.reason,
          httpStatus: servedCatalog.httpStatus,
          ...(servedCatalog.errorCode !== undefined && {
            errorCode: servedCatalog.errorCode,
          }),
          entry: keptEntry,
        };
      }
    }
  } catch (error) {
    logError(error);
    return {
      ...common(),
      fetchStatus: "error",
      fetchReason: "exception",
      entry: cached,
    };
  }
}
//@ chunk-c0w5a81j.js:9657-10216 placement
async function checkCatalogKey(source) {
  if (source.trust.kind === "untrusted") return;
  let publishedCatalogCache = await readPublishedCatalogCache(source.cacheKey);
  if (publishedCatalogCache === undefined) return;
  let verified = await verifySignedDocument(publishedCatalogCache, source);
  if (!verified.ok) {
    if (verified.reason === "unknown_key" && source.kind !== "hosted" && isManagedCatalogSourceUnverified()) {
      logForDebugging(
        "[publishedCatalog] cached document names a key this session does not hold while server-managed settings are unconfirmed; not using it this session, keeping the file",
      );
      forgetPublishedCatalogCache(source.cacheKey);
      return;
    }
    logForDebugging(`[publishedCatalog] cached document not re-established (${verified.reason}); discarding`);
    await clearPublishedCatalogCache(source.cacheKey);
    return;
  }
  let entry = verified.entry;
  await storePublishedCatalog(source.cacheKey, entry, {
    verified: true,
  });
  return entry;
}
//@ chunk-c0w5a81j.js:10216-10739 placement
async function verifySignedDocument(publishedCatalogCache, source) {
  let trust = source.trust;
  if (trust.kind === "untrusted")
    return {
      ok: false,
      reason: "untrusted_source",
    };
  let encoded = base64URLEncode(publishedCatalogCache.documentBytes);
  if (encoded === undefined)
    return {
      ok: false,
      reason: "undecodable_bytes",
    };
  let signature = await verifyCatalogSignature_2({
    documentBytes: encoded,
    sidecar: publishedCatalogCache.sidecar,
    roots: trust.roots,
  });
  if (!signature.ok)
    return {
      ok: false,
      reason: signature.reason,
    };
  let catalogDocument = parseCatalogDocument(encoded);
  if (catalogDocument === undefined)
    return {
      ok: false,
      reason: "unparseable_document",
    };
  let rollbackReason = await checkVersionRollback(catalogDocument, source, undefined, signature.rootId);
  if (rollbackReason !== undefined)
    return {
      ok: false,
      reason: rollbackReason,
    };
  await recordPublishedCatalogFloor(source.cacheKey, catalogDocument);
  return {
    ok: true,
    entry: {
      ...publishedCatalogCache,
      document: catalogDocument,
      rootId: signature.rootId,
      source: source.kind,
    },
  };
}
//@ chunk-c0w5a81j.js:10739-10877 placement (2.1.88 match: base64URLEncode, 1)
function base64URLEncode(buffer) {
  let buffer_2 = Buffer.from(buffer, "base64");
  if (buffer_2.toString("base64") !== buffer) return;
  return buffer_2.length > 0 && buffer_2.length <= CATALOG_SCHEMA ? new Uint8Array(buffer_2) : undefined;
}
//@ chunk-c0w5a81j.js:10877-11016 placement
function parseCatalogDocument(documentBytes) {
  let parsed = safeParseJSON(Buffer.from(documentBytes).toString("utf8"), false);
  if (getSchemaVersion(parsed) !== CATALOG_SCHEMA_VERSION) return;
  let validated = CatalogDocumentSchema().safeParse(parsed);
  return validated.success ? validated.data : undefined;
}
//@ chunk-c0w5a81j.js:11016-11136 placement
function getMinAcceptedVersion(source, cached, rootId) {
  let isTrustedRoot = source.kind === "hosted" || classifyKeySource(rootId) === "compiled_roots";
  return Math.max(cached?.document.version ?? 0, isTrustedRoot ? bundledCatalogVersion() : 0);
}
//@ chunk-c0w5a81j.js:11136-11285 placement
async function checkVersionRollback(catalogDocument, source, cached, rootId) {
  if (catalogDocument.version < getMinAcceptedVersion(source, cached, rootId)) return "replayed_version";
  if (catalogDocument.version < (await publishedFloorVersion(source.cacheKey)))
    return "catalog_version_rollback";
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
  let pending = publishedCatalogRefreshes.get(source.cacheKey);
  if (pending) return pending;
  let refreshPromise = fetchPublishedCatalog({
    mode,
    source,
    allowNetwork,
  }).finally(() => {
    publishedCatalogRefreshes.delete(source.cacheKey);
  });
  publishedCatalogRefreshes.set(source.cacheKey, refreshPromise);
  return refreshPromise;
}
//@ chunk-c0w5a81j.js:11736-13459 placement
async function fetchPublishedCatalog({ mode, source, allowNetwork }) {
  let fetchMs;
  let withCommon = () => ({
    mode,
    source,
    ...(fetchMs !== undefined && {
      fetchMs,
    }),
  });
  let cached;
  let isExpired = (entry) => entry !== undefined && isDocumentExpired(entry.document);
  try {
    if (source.trust.kind === "untrusted") {
      logForDebugging(`[publishedCatalog] ${source.kind} source skipped: ${source.trust.reason}`);
      return {
        ...withCommon(),
        fetchStatus: "skipped",
        fetchReason: source.trust.reason,
        expired: false,
        entry: undefined,
      };
    }
    cached = await checkCatalogKey(source);
    if (cached && !isCacheEntryStale(cached))
      return {
        ...withCommon(),
        fetchStatus: "cache_fresh",
        expired: false,
        entry: cached,
      };
    if (cached && isExpired(cached))
      logForDebugging("[publishedCatalog] cached document is past its expires_at; refreshing");
    if (!allowNetwork && source.kind !== "file")
      return {
        ...withCommon(),
        fetchStatus: "cache_only",
        expired: isExpired(cached),
        entry: cached,
      };
    let startTime = performance.now();
    let publishedCatalog = await fetchPublishedCatalog_2(source, {
      etag: cached?.etag,
    });
    if (source.kind !== "file") fetchMs = Math.round(performance.now() - startTime);
    switch (publishedCatalog.status) {
      case "not_modified": {
        let nextEntry = cached ? withCacheTimestamps(cached) : undefined;
        if (nextEntry) await writePublishedCatalogCache(source.cacheKey, nextEntry);
        return {
          ...withCommon(),
          fetchStatus: "not_modified",
          httpStatus: publishedCatalog.httpStatus,
          expired: isExpired(nextEntry),
          entry: nextEntry,
        };
      }
      case "error":
        return {
          ...withCommon(),
          fetchStatus: "error",
          fetchReason: publishedCatalog.reason,
          httpStatus: publishedCatalog.httpStatus,
          expired: isExpired(cached),
          entry: cached,
        };
      case "ok": {
        let verdict = await verifyCatalogSignature({
          source,
          cached,
          result: publishedCatalog,
        });
        if (!verdict.ok) {
          logForDebugging(
            `[publishedCatalog] document rejected: ${verdict.reason}; keeping ${cached ? "last good document" : "nothing"}`,
          );
          return {
            ...withCommon(),
            fetchStatus: "rejected",
            fetchReason: verdict.reason,
            httpStatus: publishedCatalog.httpStatus,
            expired: isExpired(cached),
            entry: cached,
          };
        }
        let entry = buildCacheEntry({
          document: verdict.document,
          documentBytes: publishedCatalog.documentBytes,
          sidecar: publishedCatalog.sidecar,
          etag: publishedCatalog.etag,
          source: source.kind,
          rootId: verdict.rootId,
        });
        await writePublishedCatalogCache(source.cacheKey, entry);
        let expired = isExpired(entry);
        logForDebugging(
          `[publishedCatalog] accepted ${source.kind} document v${verdict.document.version} (verified by ${verdict.rootId})${expired ? ", past its expires_at" : ""}`,
        );
        return {
          ...withCommon(),
          fetchStatus: "ok",
          httpStatus: publishedCatalog.httpStatus,
          expired,
          entry,
        };
      }
    }
  } catch (error) {
    logError(error);
    return {
      ...withCommon(),
      fetchStatus: "error",
      fetchReason: "exception",
      expired: isExpired(cached),
      entry: cached,
    };
  }
}
//@ chunk-c0w5a81j.js:13459-14148 placement
async function verifyCatalogSignature({ source, cached, result }) {
  let trust = source.trust;
  if (trust.kind === "untrusted")
    return {
      ok: false,
      reason: "unsigned",
    };
  if (!result.hasSidecar)
    return {
      ok: false,
      reason: "unsigned",
    };
  let signature = await verifyCatalogSignature_2({
    documentBytes: result.documentBytes,
    sidecar: result.sidecar,
    roots: trust.roots,
  });
  if (!signature.ok)
    return {
      ok: false,
      reason: signature.reason,
    };
  let parsed = safeParseJSON(Buffer.from(result.documentBytes).toString("utf8"), false);
  let schemaVersion = getSchemaVersion(parsed);
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
  let validated = CatalogDocumentSchema().safeParse(parsed);
  if (!validated.success)
    return {
      ok: false,
      reason: "parse_failed",
    };
  let parsedDocument = validated.data;
  let rollback = await checkVersionRollback(parsedDocument, source, cached, signature.rootId);
  if (rollback !== undefined) {
    await applyPublishedCatalog(parsedDocument);
    return {
      ok: false,
      reason: rollback,
    };
  }
  await recordPublishedCatalogFloor(source.cacheKey, parsedDocument);
  return {
    ok: true,
    document: parsedDocument,
    rootId: signature.rootId,
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
    let scope = catalogScope();
    if (scope === null) {
      applyCompiledFallback("no_scope", "no cache scope");
      return;
    }
    let surface = catalogSurface();
    let cachedCatalog = await loadCachedCatalog(scope, surface);
    let sourceLabel = "cache";
    let fetchStatus;
    let fetchFields = {};
    let timing;
    let heldOff = false;
    let outcome;
    if (cachedCatalog === undefined) {
      let markerPath = headless ? catalogCacheFilePath(scope, surface) : null;
      if (markerPath !== null && !(await isRetryDue(markerPath))) heldOff = true;
      else {
        let refresh = refreshServedCatalogOnce({
          allowNetwork: true,
        });
        if (markerPath !== null)
          refresh = refresh.then(async (result) => {
            await settleServedRefresh(markerPath, result);
            return result;
          });
        let waited = await awaitServedRefresh(refresh, {
          wait: "first_fetch",
          headless,
          budgetMs: fetchBudgetMs(headless),
          scope,
        });
        timing = waited.timing;
        outcome = waited.outcome;
        cachedCatalog = waited.outcome?.entry;
        fetchStatus = waited.outcome === undefined ? "timeout" : waited.outcome.fetchStatus;
        fetchFields = getFetchFields(waited.outcome);
        sourceLabel = `fetch:${fetchStatus}`;
      }
    } else if (!headless && isCatalogCacheStale(cachedCatalog)) {
      let waited = await awaitServedRefresh(
        refreshServedCatalogOnce({
          allowNetwork: true,
        }),
        {
          wait: "stale_refresh",
          headless,
          budgetMs: SHORT_FETCH_BUDGET_MS,
          scope,
        },
      );
      timing = waited.timing;
      outcome = waited.outcome;
      fetchStatus = waited.outcome === undefined ? "timeout" : waited.outcome.fetchStatus;
      if (waited.outcome?.fetchReason === "lane_unavailable") cachedCatalog = undefined;
      else {
        cachedCatalog = waited.outcome?.entry ?? cachedCatalog;
        sourceLabel = `stale cache: waited ${timing.wait_ms}ms for refresh \u2192 ${isCatalogCacheStale(cachedCatalog) ? "kept stale" : "refreshed"} (fetch:${fetchStatus})`;
      }
    }
    if (getProviderState().servedCatalogActive !== undefined || !isSameCatalogScope(catalogScope(), scope))
      return;
    let catalog = cachedCatalog?.catalog ?? null;
    let resolution = cachedCatalog?.resolution ?? outcome?.resolution;
    let routeFields = getRouteFields(scope, resolution);
    if (catalog === null) {
      if (cachedCatalog !== undefined)
        applyCompiledFallback(
          "surface_not_served",
          "server serves this surface no rows",
          {
            ...routeFields,
            ...timing,
          },
          scope,
        );
      else if (heldOff)
        applyCompiledFallback(
          "headless_held_off",
          "nothing cached, and a recent headless request failed, so this run does not ask again",
          routeFields,
          scope,
        );
      else if (outcome !== undefined && isRefusalFetchFailure(outcome))
        applyRefusalFallback(outcome, {
          headless,
          timing,
          lane: routeFields,
          scope,
        });
      else
        applyCompiledFallback(
          `${headless ? "headless_" : ""}fetch_${fetchStatus ?? "none"}`,
          `nothing cached, ${sourceLabel} produced no rows`,
          {
            ...routeFields,
            ...fetchFields,
            ...timing,
          },
          scope,
        );
      return;
    }
    if (offeredCatalogRows(catalog).length === 0) {
      applyCompiledFallback(
        activeCatalogModels_2(catalog).length === 0 ? "no_selectable_rows" : "no_offered_rows",
        `served rows hold no model this build offers (${catalogModels(catalog).length} rows via ${sourceLabel})`,
        {
          ...routeFields,
          ...timing,
        },
        scope,
      );
      return;
    }
    let stale = cachedCatalog !== undefined && isCatalogCacheStale(cachedCatalog);
    activateServedCatalog(catalog, cachedCatalog?.fetchedAt, stale, {
      route: catalogEndpointForScope(scope),
      credential: catalogAuthKind(scope),
      organizationUuid: cachedCatalog?.organizationUuid,
      resolution: cachedCatalog?.resolution,
    });
    logFeatureOk("model_catalog_primary", {
      decision: fromEnum("served"),
      ...routeFields,
      ...timing,
    });
    logForDebugging(
      `[servedCatalog] primary: using served rows (${catalogModels(catalog).length} rows via ${sourceLabel} over the ${catalogEndpointForScope(scope)} route${describeCredentialKind(catalogAuthKind(scope))}, fetched ${Math.max(0, Math.round((Date.now() - (cachedCatalog?.fetchedAt ?? Date.now())) / 1000))}s ago${stale ? ", stale" : ""}); the served list replaces the compiled picker for this session`,
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
function getFetchFields(outcome) {
  let reason = fromEnumOpt(outcome?.fetchReason);
  let httpStatus = outcome?.httpStatus;
  return {
    ...(reason !== undefined && {
      fetch_reason: reason,
    }),
    ...(httpStatus !== undefined && {
      http_status: httpStatus,
    }),
  };
}
//@ chunk-c0w5a81j.js:16699-16835 placement
function getRouteFields(scope, resolution) {
  let route = catalogEndpointForScope(scope);
  return {
    route: fromEnum(route),
    credential: fromEnum(catalogAuthKind(scope)),
    auth_kind: fromEnum(catalogCredentialKind()),
    ...(route === "orgless" && {
      resolution: fromEnum(resolution ?? "unknown"),
    }),
  };
}
//@ chunk-c0w5a81j.js:16835-17027 placement
function describeCredentialKind(kind) {
  switch (kind) {
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
function catalogRouteAndCredential(scope) {
  return {
    route: catalogEndpointForScope(scope),
    credential: catalogAuthKind(scope),
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
  if (outcome === undefined)
    refresh.then((outcome) => logLateFetch(outcome, options)).catch((error) => logError(error));
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
function logLateFetch(outcome, { wait, headless, budgetMs, scope }) {
  let failed = outcome.fetchStatus === "error" || outcome.fetchStatus === "skipped";
  let fields = {
    wait: fromEnum(wait),
    headless,
    wait_budget_ms: budgetMs,
    ...getRouteFields(scope, outcome.resolution),
    ...(outcome.fetchMs !== undefined && {
      fetch_ms: outcome.fetchMs,
    }),
    fetch_status: fromEnum(outcome.fetchStatus),
    ...getFetchFields(outcome),
    cache_written:
      !failed &&
      outcome.fetchStatus !== "cache_fresh" &&
      outcome.fetchStatus !== "cache_only" &&
      outcome.entry !== undefined,
  };
  if (failed) logFeatureSad("model_catalog_late_fetch", `fetch_${outcome.fetchStatus}`, fields);
  else logFeatureOk("model_catalog_late_fetch", fields);
  logForDebugging(
    `[servedCatalog] ${wait} settled after its ${budgetMs}ms wait: fetch:${outcome.fetchStatus}, request took ${outcome.fetchMs ?? "?"}ms`,
  );
}
//@ chunk-c0w5a81j.js:18174-18213 placement
function isRefusalFetchFailure(outcome) {
  return isRefusalReason(outcome.fetchReason);
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
function applyRefusalFallback(outcome, { headless, timing, lane, scope }) {
  let offReason = REFUSAL_OFF_REASONS[outcome.fetchReason];
  activateFallbackCatalog(offReason, catalogRouteAndCredential(scope));
  logFeatureOk("model_catalog_primary", {
    decision: fromEnum("off"),
    off_reason: fromEnum(offReason),
    ...emptyServedOverrides(offReason),
    headless,
    ...lane,
    ...(outcome.httpStatus !== undefined && {
      http_status: outcome.httpStatus,
    }),
    ...(outcome.errorCode !== undefined && {
      refusal_code: fromEnum(outcome.errorCode),
    }),
    ...timing,
  });
  let statusLabel = `${outcome.httpStatus ?? "?"}${outcome.errorCode !== undefined ? ` ${outcome.errorCode}` : ""}`;
  logForDebugging(
    `[servedCatalog] primary: served rows unavailable (${describeRefusalReason(outcome.fetchReason)}: ${statusLabel}); using compiled behavior`,
  );
}
//@ chunk-c0w5a81j.js:18791-19010 placement
function applyCompiledFallback(offReason, detail, decisionFields, scope, organizationUuid) {
  activateFallbackCatalog(offReason, {
    ...(scope !== undefined && catalogRouteAndCredential(scope)),
    ...(organizationUuid !== undefined && {
      organizationUuid,
    }),
  });
  logFeatureSad("model_catalog_primary", offReason, {
    ...emptyServedOverrides(offReason),
    ...decisionFields,
  });
  logForDebugging(`[servedCatalog] primary: served rows unavailable (${detail}); using compiled behavior`);
}
//@ chunk-c0w5a81j.js:19010-19034 placement
function emptyServedOverrides(reason) {
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
  let fields = {};
  try {
    let priorActive = servedCatalogActive();
    if (priorActive !== undefined && !isKeyAuthFallbackSource(priorActive)) return;
    let allowNetwork = !headless || isPublishedCatalogUsable();
    let isFirstParty = allowNetwork && isFirstPartyApiBackend();
    let budgetMs = !isFirstParty
      ? 0
      : headless
        ? HEADLESS_PRIMARY_DECISION_BUDGET_MS
        : PRIMARY_DECISION_BUDGET_MS;
    let deadline = Date.now() + budgetMs;
    let settingsUnconfirmed =
      shouldWaitForPublishedCatalog() &&
      catalogSourceMode() === "primary" &&
      (await waitForRemoteSettings(deadline));
    let publishedCatalogBlock = getPublishedCatalogBlock();
    if (publishedCatalogBlock !== null) {
      if (settingsUnconfirmed && publishedCatalogBlock === "essential_traffic") {
        logFeatureSad(
          "model_catalog_published",
          "essential_traffic",
          buildDecisionFields(headless, fields, settingsUnconfirmed),
        );
        logForDebugging(
          "[publishedCatalog] primary: nonessential traffic is disabled and the server-managed catalog source is not yet confirmed by the server; published path off this session",
        );
      }
      return;
    }
    let blockMode = publishedCatalogBlockMode();
    let publishedCatalogSource = resolvePublishedCatalogSource();
    if (!publishedCatalogSource.ok) {
      if (blockMode === "primary")
        applyPublishedFallback(
          publishedCatalogSource.reason,
          "configured catalog URL is unusable",
          buildDecisionFields(headless, fields, settingsUnconfirmed),
        );
      return;
    }
    let { source } = publishedCatalogSource;
    if (source.trust.kind === "untrusted") {
      if (blockMode === "primary")
        applyPublishedFallback(
          source.trust.reason,
          `custom source is untrusted (${source.trust.reason})`,
          buildDecisionFields(headless, fields, settingsUnconfirmed),
        );
      return;
    }
    if (blockMode !== "primary") {
      await readPublishedCatalogCache(source.cacheKey);
      return;
    }
    let surface = catalogSurface();
    let cached = await checkCatalogKey(source);
    let sourceLabel = cached === undefined ? "nothing cached, no request" : "cache";
    let fetchStatus;
    let heldOff = false;
    let mayFetch = isFirstParty || source.kind === "file";
    let isFileSource = (headless || !isFirstParty) && source.kind === "file";
    let remainingBudget = () =>
      isFileSource ? PRIMARY_DECISION_BUDGET_MS : Math.max(0, deadline - Date.now());
    let budgetMs_2 = isFileSource ? PRIMARY_DECISION_BUDGET_MS : budgetMs;
    let markerPath =
      isFirstParty && source.kind !== "file" ? publishedCatalogCachePath(source.cacheKey) : null;
    let needsRefresh =
      cached === undefined ? mayFetch : isCacheEntryStale(cached) && (headless ? isFileSource : mayFetch);
    let runRefresh = async (label) => {
      let publishedRefresh = startPublishedRefresh(markerPath, allowNetwork);
      let waited = await awaitRefreshOutcome(publishedRefresh.refresh, {
        waitMs: remainingBudget(),
        budgetMs: budgetMs_2,
        label,
      });
      if (waited.outcome === undefined) await publishedRefresh.countSpentWait();
      return waited;
    };
    if (
      needsRefresh &&
      markerPath !== null &&
      (headless ? !(await isRetryDue(markerPath)) : await isInRetryBackoff(markerPath))
    ) {
      heldOff = true;
      fields = {
        held_off: true,
      };
      if (!headless)
        startPublishedRefresh(markerPath, allowNetwork).refresh.catch((error) => logError(error));
      sourceLabel = `${cached === undefined ? "nothing cached" : "stale cache"}, ${headless ? "no request: a recent headless request failed and its hold-off has not passed" : "not waiting: the last request timed out or failed recently, so this one runs in the background"}`;
    } else if (needsRefresh && cached === undefined) {
      let waited = await runRefresh("published catalog first fetch");
      cached = waited.outcome?.entry;
      fetchStatus = waited.fetchStatus;
      fields = waited.fields;
      sourceLabel = `fetch:${fetchStatus} after ${waited.waitMs}ms`;
    } else if (needsRefresh && cached !== undefined) {
      let waited = await runRefresh("published catalog stale refresh");
      fetchStatus = waited.fetchStatus;
      fields = waited.fields;
      cached = waited.outcome?.entry ?? cached;
      sourceLabel = `stale cache: waited ${waited.waitMs}ms for refresh \u2192 ${isCacheEntryStale(cached) ? "kept stale" : "refreshed"} (fetch:${fetchStatus})`;
    }
    if (servedCatalogActive() !== priorActive) return;
    let catalogDocument = cached?.document ?? bundledCatalogDocument();
    if (catalogDocument !== null && isHeldForModel(catalogDocument, providerCatalogKey(getAPIProvider()))) {
      applyPublishedFallback(
        "publisher_hold",
        "the publisher holds this backend on compiled behavior",
        buildDecisionFields(headless, fields, settingsUnconfirmed),
      );
      return;
    }
    let { catalog, kind } = selectCatalogSource(cached, surface);
    if (catalog === null) {
      if (cached !== undefined)
        applyPublishedFallback(
          "surface_not_served",
          "document serves this surface no rows",
          buildDecisionFields(headless, fields, settingsUnconfirmed),
        );
      else if (heldOff)
        applyPublishedFallback(
          headless ? "headless_held_off" : "held_off",
          `no seed, ${sourceLabel}`,
          buildDecisionFields(headless, fields, settingsUnconfirmed),
        );
      else if (mayFetch)
        applyPublishedFallback(
          `${headless && markerPath !== null ? "headless_" : ""}fetch_${fetchStatus ?? "none"}`,
          `nothing cached and no seed, ${sourceLabel} produced no rows`,
          buildDecisionFields(headless, fields, settingsUnconfirmed),
        );
      else
        applyPublishedFallback(
          allowNetwork ? "deferred_no_cache" : "headless_no_cache",
          `nothing cached, ${allowNetwork ? "a third-party launch does not wait for the fetch" : "this headless launch may not fetch"}, no seed`,
          buildDecisionFields(headless, fields, settingsUnconfirmed),
        );
      return;
    }
    if (kind === "seed") {
      let missingFamilyDefault = findMissingFamilyDefault(catalog);
      if (missingFamilyDefault !== null) {
        applyPublishedFallback(
          "seed_stale",
          `${sourceLabel}; compiled seed resolves ${missingFamilyDefault.family} to ${missingFamilyDefault.seed}, this build to ${missingFamilyDefault.compiled}`,
          buildDecisionFields(headless, fields, settingsUnconfirmed),
        );
        return;
      }
      let mismatch = isFirstPartyApiBackend() ? null : findSeedMismatch(catalog);
      if (mismatch !== null) {
        applyPublishedFallback(
          "seed_moves_model",
          `compiled seed would move ${mismatch.what} to ${mismatch.seed}${mismatch.compiled === undefined ? "" : `, this build's table says ${mismatch.compiled}`}`,
          buildDecisionFields(headless, fields, settingsUnconfirmed),
        );
        return;
      }
    }
    if (offeredCatalogRows(catalog).length === 0) {
      applyPublishedFallback(
        activeCatalogModels_2(catalog).length === 0 ? "no_selectable_rows" : "no_offered_rows",
        `published rows hold no model this build offers (${catalogModels(catalog).length} rows via ${kind})`,
        buildDecisionFields(headless, fields, settingsUnconfirmed),
      );
      return;
    }
    let stale = cached !== undefined && isCacheEntryStale(cached);
    setServedCatalog(catalog, cached?.fetchedAt, stale);
    if (kind === "seed")
      logFeatureSad(
        "model_catalog_published",
        "seed",
        buildDecisionFields(headless, fields, settingsUnconfirmed),
      );
    else if (settingsUnconfirmed)
      logFeatureSad(
        "model_catalog_published",
        "remote_settings_unconfirmed",
        buildDecisionFields(headless, fields, false),
      );
    else logFeatureOk("model_catalog_published", buildDecisionFields(headless, fields, false));
    logForDebugging(
      `[publishedCatalog] primary: using ${kind} rows (${catalogModels(catalog).length} rows via ${sourceLabel}${stale ? ", stale" : ""})`,
    );
  } catch (error) {
    logError(error);
    let afterActive = servedCatalogActive();
    if (
      (afterActive === undefined || isKeyAuthFallbackSource(afterActive)) &&
      publishedCatalogBlockMode() === "primary"
    )
      applyPublishedFallback("exception", "exception", buildDecisionFields(headless, fields, false));
  }
}
//@ chunk-c0w5a81j.js:22570-22974 placement
/**
 * 启动已发布目录刷新；有重试标记作用域时把标记更新串行化，并提供 countSpentWait 在等待耗尽而获取未完成时记一次超时退避。
 */
function startPublishedRefresh(markerPath, allowNetwork) {
  let refresh = refreshPublishedCatalogOnce({
    allowNetwork,
  });
  if (markerPath === null)
    return {
      refresh,
      countSpentWait: () => Promise.resolve(),
    };
  let resolved = Promise.resolve();
  let settled = false;
  let spentWait = false;
  return {
    refresh: refresh.then(async (outcome) => {
      settled = true;
      let firstSettle = markPublishedRefreshSettled(outcome);
      resolved = resolved.then(async () => {
        if (!spentWait || outcome.fetchStatus === "ok" || outcome.fetchStatus === "not_modified")
          await settlePublishedRefresh(markerPath, outcome, firstSettle);
      });
      await resolved;
      return outcome;
    }),
    countSpentWait: () => {
      resolved = resolved.then(async () => {
        if (!settled) {
          spentWait = true;
          await writeRetryMarker(markerPath, "back_off", Date.now(), true);
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
  let outcome = await withTimeout(refresh, waitMs, label).catch(() => {
    return;
  });
  let fetchStatus = outcome === undefined ? "timeout" : outcome.fetchStatus;
  let rounded = Math.round(performance.now() - startTime);
  return {
    outcome,
    fetchStatus,
    waitMs: rounded,
    fields: {
      fetch_status: fromEnum(fetchStatus),
      ...(outcome?.fetchReason !== undefined && {
        fetch_reason: fromEnum(outcome.fetchReason),
      }),
      ...(outcome?.httpStatus !== undefined && {
        http_status: outcome.httpStatus,
      }),
      ...(outcome?.fetchMs !== undefined && {
        fetch_ms: outcome.fetchMs,
      }),
      wait_ms: rounded,
      wait_budget_ms: budgetMs,
      wait_timed_out: outcome === undefined,
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
    let { hasManagedModelDenies } = await import("./modelAllowlist.js");
    if (!hasManagedModelDenies()) return;
    let seenKeys = new Set();
    let documents = [];
    for (let resolved of [
      resolvePublishedCatalogSource({
        ignoreEnvUrl: true,
      }),
      resolvePublishedCatalogSource(),
    ]) {
      if (!resolved.ok || seenKeys.has(resolved.source.cacheKey)) continue;
      seenKeys.add(resolved.source.cacheKey);
      let cached = await checkCatalogKey(resolved.source);
      if (cached !== undefined) documents.push(cached.document);
    }
    let providerState = getProviderState();
    providerState.publishedDenyDocuments = documents;
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
  for (let family of [...MODEL_FAMILY_NAMES, "fable"]) {
    let id = getFamilyDefault(catalog, family);
    if (id === undefined) continue;
    let id_2 = resolveCatalogAlias(family, providerCatalogKey(apiProvider));
    if (
      id_2 === undefined ||
      modelIdentityKey(id) !== modelIdentityKey(id_2) ||
      hasBoldMarker(id) !== hasBoldMarker(id_2)
    )
      return {
        what: `the ${family} alias`,
        seed: id,
        compiled: id_2,
      };
  }
  let overrides = supportsFamilyOverride() ? providerModelOverrides(catalog, "default") : {};
  let seedDefault =
    overrides.perProvider ??
    overrides.everywhere ??
    (apiProvider === "firstParty" ? catalog.state?.model : undefined);
  return seedDefault === undefined
    ? null
    : {
        what: "the Default",
        seed: seedDefault,
        compiled: undefined,
      };
}
//@ chunk-c0w5a81j.js:24217-24256 placement
function hasBoldMarker(id) {
  return /\[1m\]/i.test(id);
}
//@ chunk-c0w5a81j.js:24256-24370 placement
function selectCatalogSource(cached, surface) {
  if (cached !== undefined)
    return {
      catalog: surfaceStateFor(cached.document, surface),
      kind: cached.source,
    };
  return {
    catalog: bundledSurfaceState(surface),
    kind: "seed",
  };
}
//@ chunk-c0w5a81j.js:24370-24712 placement
/**
 * 若服务端托管设置尚未确认，最多等待到截止时间；仍未确认则记录并返回 true（本会话不使用这些设置决定目录）。
 */
async function waitForRemoteSettings(deadline) {
  if (shouldWaitForRemoteSettings()) {
    let remainingMs = deadline - Date.now();
    if (remainingMs > 0) {
      logForDebugging(
        `[publishedCatalog] waiting up to ${remainingMs}ms for server-managed settings to be confirmed`,
      );
      await waitForLoadStatus(remainingMs);
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
async function waitForLoadStatus(timeoutMs) {
  let unsubscribe = () => {};
  let promise = new Promise((resolve) => {
    unsubscribe = onLastLoadStatusChanged((status) => {
      if (status !== undefined) resolve();
    });
    if (getLastLoadStatus() !== undefined) resolve();
  });
  try {
    await withDeadline(promise, timeoutMs);
  } finally {
    unsubscribe();
  }
}
//@ chunk-c0w5a81j.js:25020-25120 placement
function buildDecisionFields(headless, extra, settingsUnconfirmed) {
  return {
    auth_kind: fromEnum(catalogCredentialKind()),
    headless,
    ...extra,
    ...(settingsUnconfirmed && {
      remote_settings_unconfirmed: true,
    }),
  };
}
//@ chunk-c0w5a81j.js:25120-25273 placement
function applyPublishedFallback(reason, detail, decisionFields) {
  setServedCatalog(null);
  logFeatureSad("model_catalog_published", reason, decisionFields);
  logForDebugging(
    `[publishedCatalog] primary: published rows unavailable (${detail}); using compiled behavior`,
  );
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
async function refreshServedModelCapabilities(storage, credentials) {
  if (!isModelCapabilitiesCacheEnabled()) return;
  if (isEssentialTrafficOnly()) return;
  if (isDiskless()) return;
  try {
    if (await loadFreshCapabilities(stripAnyVersatileSuffix(getMainLoopModel()), storage)) {
      logForDebugging("[modelCapabilities] cached model list is recent enough, not fetching");
      return;
    }
    let anthropicClient = await getAnthropicClient({
      maxRetries: 1,
      agentContext: mainAgentContext(),
      credentials,
      storageV5: storage,
    });
    let betas = isClaudeAISubscriber() ? [OAUTH_BETA_HEADER] : undefined;
    let models = [];
    for await (let rawModel of anthropicClient.models.list({
      betas,
      limit: 1000,
    })) {
      let modelCapability = parseModelCapability(rawModel);
      if (modelCapability) models.push(modelCapability);
    }
    if (models.length === 0) return;
    await refreshModelCapabilities(models, storage);
  } catch (error) {
    logForDebugging(
      `[modelCapabilities] fetch failed: ${error instanceof Error ? error.message : "unknown"}`,
    );
  }
}
//@ chunk-3wek6r2k.js:80820-81293 placement
function pickerSnapshot() {
  let options = getEnabledModelOptions();
  let pickerIds = dedupeModelIds(userModelIds(options));
  let basePickerIds = dedupeModelIds(userModelIds(options.filter((option) => !option.sessionTail)));
  let model = getMainLoopModel();
  let canonicalName = getCanonicalName(model);
  let modelMaxOutputTokens = getModelMaxOutputTokens(model);
  return {
    pickerIds,
    basePickerIds,
    defaultModel: getDefaultMainLoopModel(),
    aliasTargets: {
      opus: getDefaultOpusModel(),
      sonnet: getDefaultSonnetModel(),
      haiku: getDefaultHaikuModel(),
    },
    mainLoopModel: model,
    mainLoopCanonical: canonicalName,
    contextWindow: getContextWindow(model, getSdkBetas()),
    maxOutputTokens: modelMaxOutputTokens.upperLimit,
    defaultOutputTokens: modelMaxOutputTokens.default,
    defaultOutputTokensRequested: defaultMaxOutputTokens(model),
    defaultEffort: String(getDefaultEffortForModel(model)),
    defaultEffortPinnedAboveServed: hasAnyDefaultEffort(model),
    capabilities: EFFORT_CAPABILITY_KEYS.filter(
      (capability) => modelDefinitelySupports(canonicalName, capability, model) === true,
    ),
  };
}
//@ chunk-3wek6r2k.js:81293-82907 placement
/**
 * 对比服务端下发的模型目录与本地编译目录、选择器列表，得出差异。
 */
function compareServedCatalog(catalog, snapshot, provenance) {
  let servedIds = dedupeModelIds(
    selectableRowIds({
      catalog,
      provenance,
    }),
  );
  let pickerIds = snapshot.pickerIds;
  let servedBaseIds = dedupeModelIds(
    selectableNonOverflowRowIds({
      catalog,
      provenance,
    }),
  );
  let basePickerIds = snapshot.basePickerIds;
  let mapped = basePickerIds.map(stripModelDateSuffix);
  let mapped_2 = servedBaseIds.map(stripModelDateSuffix);
  let compiledSet = new Set(mapped);
  let servedSet = new Set(mapped_2);
  let addedCount = count(mapped_2, (id) => !compiledSet.has(id));
  let removedCount = count(mapped, (id) => !servedSet.has(id));
  let familyDefaults = getFamilyDefaults(catalog);
  let offeredRows = offeredCatalogRows(catalog);
  let modelCatalogStatus = getModelCatalogStatus(catalog, snapshot.mainLoopModel);
  let mainTag =
    modelCatalogStatus.status === "known"
      ? [
          snapshot.mainLoopModel,
          getCatalogState().modelKnowledge?.identitySpelling(snapshot.mainLoopModel),
          snapshot.mainLoopCanonical,
        ].find(
          (candidate) => candidate !== undefined && findServedCatalogRow(catalog, candidate) !== undefined,
        )
      : undefined;
  let servedDefaultOutput =
    mainTag === undefined
      ? undefined
      : clampInRange(getDefaultOutputTokens(catalog, mainTag), OUTPUT_TOKEN_RANGE);
  let nextDefaultOutput =
    mainTag === undefined
      ? snapshot.defaultOutputTokens
      : Math.min(
          servedDefaultOutput ?? snapshot.defaultOutputTokensRequested,
          clampInRange(servedMaxOutputTokensOf(catalog, mainTag), OUTPUT_TOKEN_RANGE) ??
            snapshot.maxOutputTokens,
        );
  let servedDefaultEffort = mainTag === undefined ? undefined : getDefaultEffort(catalog, mainTag);
  let nextDefaultEffort =
    snapshot.defaultEffortPinnedAboveServed || servedDefaultEffort === undefined
      ? snapshot.defaultEffort
      : servedDefaultEffort;
  return {
    picker: {
      match: sameOrder(pickerIds, servedIds),
      old: pickerIds,
      new: servedIds,
      main: {
        match: sameOrder(mapped, mapped_2),
        setMatch: addedCount === 0 && removedCount === 0,
        old: basePickerIds,
        new: servedBaseIds,
        added: addedCount,
        removed: removedCount,
        overflowCount: servedIds.length - servedBaseIds.length,
      },
    },
    defaultModel: compareModelIds(snapshot.defaultModel, catalogStateModel(catalog)),
    aliases: {
      opus: compareModelIds(snapshot.aliasTargets.opus, familyDefaults.opus),
      sonnet: compareModelIds(snapshot.aliasTargets.sonnet, familyDefaults.sonnet),
      haiku: compareModelIds(snapshot.aliasTargets.haiku, familyDefaults.haiku),
    },
    mainLoopModel: snapshot.mainLoopModel,
    contextWindow: diffField(snapshot.contextWindow, servedMaxInputTokensOf(catalog, snapshot.mainLoopModel)),
    maxOutputTokens: diffField(
      snapshot.maxOutputTokens,
      servedMaxOutputTokensOf(catalog, snapshot.mainLoopModel),
    ),
    defaultOutputTokens: {
      match: mainTag === undefined ? undefined : snapshot.defaultOutputTokens === nextDefaultOutput,
      old: snapshot.defaultOutputTokens,
      new: nextDefaultOutput,
      servedHasValue: servedDefaultOutput !== undefined,
    },
    defaultEffort: {
      match: mainTag === undefined ? undefined : snapshot.defaultEffort === nextDefaultEffort,
      old: snapshot.defaultEffort,
      new: nextDefaultEffort,
      servedHasValue: servedDefaultEffort !== undefined,
    },
    mainLoopKnowledge: modelCatalogStatus,
    offeredCount: offeredRows.length,
    mappedCount: count(offeredRows, (row) => getModelCatalogStatus(catalog, row.id).status === "mapped"),
    notOfferedCount: unselectableActiveRows(catalog).length,
    capabilities: compareEffortCapabilities(
      findServedCatalogRow(catalog, snapshot.mainLoopModel),
      snapshot.capabilities,
    ),
    familyDefaultCount: zeroFamilyDefaultCount(catalog),
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
  let keys = EFFORT_CAPABILITY_KEYS;
  let served = uniq(
    capabilities_2
      .map((capability) => capability.trim().toLowerCase())
      .filter((capability) => keys.includes(capability)),
  );
  let selected = new Set(capabilities);
  return {
    match: served.every((capability) => selected.has(capability)),
    servedCount: served.length,
  };
}
//@ chunk-3wek6r2k.js:83152-83176 placement
function zeroFamilyDefaultCount(catalog) {
  return 0;
}
//@ chunk-3wek6r2k.js:83176-83279 placement
function dedupeModelIds(ids) {
  let seen = new Set();
  let out = [];
  for (let id of ids) {
    let normalized = normalizeModelId(id);
    if (!seen.has(normalized)) {
      seen.add(normalized);
      out.push(normalized);
    }
  }
  return out;
}
//@ chunk-3wek6r2k.js:83279-83384 placement
function compareModelIds(oldId, newId) {
  let oldNormalized = normalizeModelId(oldId);
  let newNormalized = newId === undefined ? undefined : normalizeModelId(newId);
  return {
    match: newNormalized === undefined ? undefined : oldNormalized === newNormalized,
    old: oldNormalized,
    new: newNormalized,
  };
}
//@ chunk-3wek6r2k.js:83384-83451 placement
function diffField(oldValue, newValue) {
  return {
    match: newValue === undefined ? undefined : oldValue === newValue,
    old: oldValue,
    new: newValue,
  };
}
//@ chunk-3wek6r2k.js:83451-83533 placement
function userModelIds(options) {
  return options
    .flatMap((option) => (option.value === null ? [] : [option.value]))
    .map((value) => parseUserSpecifiedModel(value));
}
//@ chunk-3wek6r2k.js:83533-83603 placement
function sameOrder(a, b) {
  return a.length === b.length && a.every((value, index) => value === b[index]);
}
//@ chunk-3wek6r2k.js:83603-83653 placement
function stripModelDateSuffix(id) {
  return normalizeModelId(id).replace(/-\d{8}$/, "");
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
  let scope = catalogScope();
  let surface = catalogSurface();
  let cachePath =
    allowNetwork && isPlainNonInteractive() && scope !== null ? catalogCacheFilePath(scope, surface) : null;
  let shouldFetch = allowNetwork && (cachePath === null || (await isRetryDue(cachePath)));
  let outcome = await refreshServedCatalogOnce({
    allowNetwork: shouldFetch,
  });
  if (outcome.mode === "off") return;
  if (cachePath !== null && shouldFetch) await settleServedRefresh(cachePath, outcome);
  let catalog = outcome.entry?.catalog ?? null;
  let freshOutcome = outcome.fetchStatus !== "cache_fresh" && outcome.fetchStatus !== "cache_only";
  if (catalog === null && !freshOutcome && (isPlainNonInteractive() || !allowNetwork)) return;
  let comparison = null;
  let compareFailed = false;
  if (catalog !== null)
    try {
      comparison = compareServedCatalog(catalog, withCatalogSuppressed(pickerSnapshot), "served");
    } catch (error) {
      compareFailed = true;
      logError(error);
    }
  logEvent(
    "tengu_model_catalog_compare",
    logServedCatalogOutcome({
      outcome,
      catalog,
      comparison,
      compareFailed,
      catalogSource: servedCatalogSource(),
    }),
  );
  logForDebugging(
    `[servedCatalog] shadow compare logged (fetch=${outcome.fetchStatus}, rows=${catalog === null ? 0 : catalogModels(catalog).length}, source=${servedCatalogSource() ?? "compiled"})`,
  );
  reconcileServedModels(
    comparison,
    hiddenIdsForOutcome({
      catalog,
      prior: outcome.prior,
      sessionMaskedIds: getMaskedModelIds(),
    }),
  );
}
//@ chunk-3wek6r2k.js:84544-84940 placement
function reconcileServedModels(comparison, isHidden) {
  let catalog = activeServedCatalog();
  if (comparison === null || catalog === null) return;
  let canonicalIds = new Set(
    activeCatalogModelIds(catalog).map((id) => firstPartyNameToCanonical(normalizeModelId(id))),
  );
  let mapped = comparison.picker.old
    .filter((id) => !canonicalIds.has(firstPartyNameToCanonical(id)))
    .map((id) => (isHidden(id) ? CONFIDENTIAL_MODEL_ID : id));
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
function hiddenIdsForOutcome(ctx) {
  return hiddenIdPredicate([ctx.catalog, ctx.prior?.catalog ?? null], () => collectHiddenModelIds(ctx));
}
//@ chunk-3wek6r2k.js:85273-85365 placement
function hiddenIdPredicate(catalogs, collectIds) {
  if (catalogs.some((catalog) => catalog !== null && hasDroppedUnidentifiedRows(catalog))) return () => true;
  let hidden = collectIds();
  return (id) => isHiddenOrMasked(id, hidden);
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
  let isHidden = hiddenIdsForOutcome({
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
        : (fromEnumOpt(DEFAULT_MODEL_SOURCES.find((source) => source === selectionSource)) ?? lit("other")),
    compare_failed: compareFailed,
    ...catalogTelemetryFields(comparison, isHidden),
  };
}
//@ chunk-3wek6r2k.js:86303-88115 placement
function catalogTelemetryFields(comparison, isHidden) {
  if (comparison === null) return {};
  let mainLoopKnowledge = comparison.mainLoopKnowledge;
  let main = comparison.picker.main;
  return {
    main_loop_model: telemetryModelLabel(comparison.mainLoopModel, isHidden),
    behaves_as_applied: mainLoopKnowledge.status === "mapped",
    behaves_as_source:
      mainLoopKnowledge.status === "mapped" ? fromEnum(mainLoopKnowledge.source) : lit("none"),
    unknown_unmapped: mainLoopKnowledge.status === "unknown",
    served_offered_count: comparison.offeredCount,
    served_mapped_count: comparison.mappedCount,
    served_not_offered_count: comparison.notOfferedCount,
    capabilities_match: comparison.capabilities.match,
    served_capability_count: comparison.capabilities.servedCount,
    served_family_default_count: comparison.familyDefaultCount,
    picker_match: main.match,
    picker_set_match: main.setMatch,
    picker_added_count: main.added,
    picker_removed_count: main.removed,
    picker_full_match: comparison.picker.match,
    served_overflow_count: main.overflowCount,
    default_match: comparison.defaultModel.match,
    opus_match: comparison.aliases.opus.match,
    sonnet_match: comparison.aliases.sonnet.match,
    haiku_match: comparison.aliases.haiku.match,
    context_window_match: comparison.contextWindow.match,
    max_output_match: comparison.maxOutputTokens.match,
    default_output_match: comparison.defaultOutputTokens.match,
    served_has_default_output: comparison.defaultOutputTokens.servedHasValue,
    default_effort_match: comparison.defaultEffort.match,
    served_has_default_effort: comparison.defaultEffort.servedHasValue,
    ...((!comparison.picker.match || !main.match) && {
      picker_old: telemetryModelList(comparison.picker.old, isHidden),
      picker_new: telemetryModelList(comparison.picker.new, isHidden),
      picker_old_count: comparison.picker.old.length,
      picker_new_count: comparison.picker.new.length,
    }),
    ...(!main.match && {
      picker_base_old: telemetryModelList(main.old, isHidden),
      picker_main_new: telemetryModelList(main.new, isHidden),
      picker_base_old_count: main.old.length,
      picker_main_new_count: main.new.length,
    }),
    ...diffFields("default", comparison.defaultModel, isHidden),
    ...diffFields("opus", comparison.aliases.opus, isHidden),
    ...diffFields("sonnet", comparison.aliases.sonnet, isHidden),
    ...diffFields("haiku", comparison.aliases.haiku, isHidden),
    ...diffTelemetryFields("context_window", comparison.contextWindow),
    ...diffTelemetryFields("max_output", comparison.maxOutputTokens),
    ...diffTelemetryFields("default_output", comparison.defaultOutputTokens),
    ...(comparison.defaultEffort.match === false && {
      default_effort_old: effortTelemetryLabel(comparison.defaultEffort.old),
      default_effort_new: effortTelemetryLabel(comparison.defaultEffort.new),
    }),
  };
}
//@ chunk-3wek6r2k.js:88115-88125 placement
var MAX_TELEMETRY_MODEL_IDS = 50;
//@ chunk-3wek6r2k.js:88125-88186 placement
function telemetryModelLabel(model, isHidden) {
  return isHidden(model)
    ? lit(CONFIDENTIAL_MODEL_ID)
    : (telemetrySafeModelName(model) ?? lit("nonconforming"));
}
//@ chunk-3wek6r2k.js:88186-88240 placement
function telemetryModelList(old, isHidden) {
  return telemetrySafeModelList(
    old.map((id) => (isHidden(id) ? CONFIDENTIAL_MODEL_ID : id)),
    MAX_TELEMETRY_MODEL_IDS,
  );
}
//@ chunk-3wek6r2k.js:88240-88282 placement
function isHiddenOrMasked(id, masked) {
  return containsMaskedId(id, masked) || !maskModelIdCached(id);
}
//@ chunk-3wek6r2k.js:88282-88406 placement
function diffFields(field, diff, isHidden) {
  if (diff.match !== false) return {};
  return {
    [`${field}_old`]: telemetryModelLabel(diff.old, isHidden),
    [`${field}_new`]: diff.new === undefined ? undefined : telemetryModelLabel(diff.new, isHidden),
  };
}
//@ chunk-3wek6r2k.js:88406-88494 placement
function diffTelemetryFields(field, diff) {
  if (diff.match !== false) return {};
  return {
    [`${field}_old`]: diff.old,
    [`${field}_new`]: diff.new,
  };
}
//@ chunk-3wek6r2k.js:88494-88589 placement
function effortTelemetryLabel(value) {
  if (isEffortLevel(value)) return fromEnum(value);
  let numeric = Number(value);
  return Number.isFinite(numeric) ? fromNumber(numeric) : lit("other");
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
async function fetchServedCatalog(allowNetwork) {
  let plainNonInteractive = isPlainNonInteractive();
  let usePublished =
    plainNonInteractive || (isFirstPartyApiBackend() && publishedCatalogBlockMode() === "primary");
  let publishedCatalogSource = resolvePublishedCatalogSource();
  let cachePath =
    allowNetwork &&
    usePublished &&
    publishedCatalogSource.ok &&
    publishedCatalogSource.source.kind !== "file" &&
    publishedCatalogSource.source.trust.kind !== "untrusted"
      ? publishedCatalogCachePath(publishedCatalogSource.source.cacheKey)
      : null;
  let shouldFetch =
    allowNetwork && (cachePath === null || !plainNonInteractive || (await isRetryDue(cachePath)));
  let outcome = await refreshPublishedCatalogOnce({
    allowNetwork: shouldFetch,
  });
  if (cachePath !== null && shouldFetch) await settlePublishedRefresh(cachePath, outcome);
  return outcome;
}
//@ chunk-3wek6r2k.js:89087-89725 placement
async function applyServedCatalog(allowNetwork) {
  let servedCatalog = await fetchServedCatalog(allowNetwork);
  if (servedCatalog.fetchStatus === "off") return;
  let surface = catalogSurface();
  let state =
    servedCatalog.entry === undefined ? null : surfaceStateFor(servedCatalog.entry.document, surface);
  let shouldCompare =
    servedCatalog.source?.kind !== "file" &&
    (servedCatalog.fetchStatus === "ok" ||
      servedCatalog.fetchStatus === "not_modified" ||
      servedCatalog.fetchStatus === "error" ||
      servedCatalog.fetchStatus === "rejected");
  if (state === null && !shouldCompare && (isPlainNonInteractive() || !allowNetwork)) return;
  let comparison = null;
  let compareFailed = false;
  if (state !== null)
    try {
      comparison = compareServedCatalog(state, withCatalogSuppressed(pickerSnapshot), "published");
    } catch (error) {
      compareFailed = true;
      logError(error);
    }
  logEvent(
    "tengu_model_catalog_compare",
    servedCatalogDiagnostics({
      outcome: servedCatalog,
      catalog: state,
      comparison,
      compareFailed,
      catalogSource: servedCatalogSource(),
      activeCatalog: activeServedCatalog(),
    }),
  );
  logForDebugging(
    `[publishedCatalog] shadow compare logged (fetch=${servedCatalog.fetchStatus}, rows=${state === null ? 0 : catalogModels(state).length}, source=${servedCatalogSource() ?? "compiled"})`,
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
  let isHidden = hiddenIdPredicate(
    [catalog, activeCatalog],
    () =>
      new Set([
        ...(catalog === null ? [] : getHiddenModelIds(catalog)),
        ...(activeCatalog === null || activeCatalog === catalog ? [] : getHiddenModelIds(activeCatalog)),
        ...sessionMaskedIds,
      ]),
  );
  let entry = outcome.entry;
  let catalogDocument = entry?.document;
  let trustKind = classifyKeySource(entry?.rootId);
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
    published_version: catalogDocument?.version,
    published_trust: fromEnumOpt(trustKind),
    published_expired: outcome.expired,
    published_age_s:
      entry === undefined ? undefined : Math.max(0, Math.round((now - entry.fetchedAt) / 1000)),
    served: catalog !== null,
    served_row_count: catalog === null ? 0 : catalogModels(catalog).length,
    served_selectable_count: catalog === null ? 0 : activeCatalogModels_2(catalog).length,
    served_has_default: catalog?.state?.model !== undefined,
    served_has_runtime: catalog !== null && catalogHasRuntime(catalog),
    compare_failed: compareFailed,
    ...managedKeyTelemetry(trustKind, comparison, isHidden),
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
