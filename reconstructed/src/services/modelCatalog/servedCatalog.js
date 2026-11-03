/**
 * services/modelCatalog/servedCatalog.ts
 *
 * 2.1.316 新增。服务端下发的模型目录。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-c0w5a81j.js (1), chunk-ynfp53zr.js (36)
 * attribution: placement 37
 */
import { join } from "path";
import { DoctorLazy } from "../../cli/handlers/util.js";
import { u, literal, E, string, _enum } from "../../../vendor/zod/v4/classic/schemas.js";
import {
  isValidEtag,
  ACCOUNT_KIND_VALUES,
  SURFACE_NAMES,
  storedRowSchema,
  selectorStateSchema,
  ETAG_RE,
  catalogDocumentSchema,
  getSelectorSurface,
} from "../../utils/model/modelCatalog/servedCatalog.js";
import { normalizeUuidOrNull } from "../../utils/agentId.js";
import {
  hasDroppedModels,
  getMaskedIdSet,
  recordMaskedFromCatalog,
} from "../../utils/model/modelCatalog/catalogEntries.js";
import { modelCatalogCacheDir, maskStorage, addMaskedIds } from "../../utils/model/modelCatalog/maskedIds.js";
import { getProviderState } from "../../utils/model/providerCaches.js";
import { isENOENT, getErrnoCode, classifyAxiosError } from "../../utils/errors.js";
import { logForDebugging } from "../../utils/debug.js";
import { safeParseJSON } from "../../utils/json.js";
import { jsonStringify } from "../../utils/slowOperations.js";
import { isEnvDefinedFalsy, isBareMode } from "../../utils/envUtils.js";
import { env } from "../../utils/env.js";
import { isEssentialTrafficOnly } from "../../utils/privacyLevel.js";
import { isFirstPartyApiBackend } from "../../utils/model/providers.js";
import { isPolicyAllowed } from "../policyLimits/policyEvidence.js";
import { getFeatureValueWithSource_CACHED_MAY_BE_STALE } from "../analytics/growthbook.js";
import {
  getOauthAccountInfo,
  isClaudeAISubscriber,
  getClaudeAIOAuthTokenOrigin,
  getClaudeAIOAuthTokenFingerprint,
  effectiveAuthTokenEnv,
  getAnthropicApiKeyFingerprint,
  shouldUseWIFAuth,
} from "../../utils/auth.js";
import { computeContentHash } from "../../utils/commitAttribution.js";
import { getWIFAuthType } from "../../utils/wifProfile.js";
import { isHostEntrypoint } from "../../utils/entrypointKinds.js";
import {
  fetchModelSelector,
  DEFAULT_OUTPUT_TOKENS,
  classifyRefusal,
  formatRefusalSuffix,
  validEtagOrUndefined,
  parseCatalogResolution,
  formatResolutionSuffix,
  responseData,
} from "../../utils/model/servedModelCatalog.js";
import { apiClient } from "../routines/routinesApi.js";

//@ chunk-ynfp53zr.js:874-902 placement
/**
 * 过期时间的抖动比例（0.1）。
 */
var CACHE_VERSION = 2;
var CACHE_TTL_MS = 3600000;
var STALE_JITTER_RATIO = 0.1;
//@ chunk-ynfp53zr.js:902-957 placement
/**
 * 给 TTL 加上抖动后的毫秒数。
 */
function jitteredTtl(r, e) {
  return Math.round(r * (1 + STALE_JITTER_RATIO * (2 * e - 1)));
}
//@ chunk-ynfp53zr.js:957-1328 placement
/**
 * 服务端模型目录缓存的 schema：版本、获取时间、过期时间、etag、组织等。
 */
var servedCatalogCacheSchema = DoctorLazy(() =>
  u({
    version: literal(CACHE_VERSION),
    fetchedAt: E(),
    staleAt: E(),
    etag: string().refine(isValidEtag).optional(),
    organizationUuid: string()
      .refine((e) => normalizeUuidOrNull(e)?.toLowerCase() === e)
      .optional(),
    resolution: _enum(ACCOUNT_KIND_VALUES).optional(),
    catalog: u({
      surface: _enum(SURFACE_NAMES),
      config: storedRowSchema(),
      state: selectorStateSchema().optional(),
    }).nullable(),
  }).transform((e) => {
    if (e.etag === undefined || e.catalog === null || !hasDroppedModels(e.catalog)) return e;
    let { etag, ...a } = e;
    return a;
  }),
);
//@ chunk-ynfp53zr.js:1328-1459 placement
function catalogEndpointForScope(r) {
  switch (r.kind) {
    case "account":
      return "org";
    case "token":
    case "api_key":
    case "profile":
    case "federation":
      return "orgless";
  }
}
//@ chunk-ynfp53zr.js:1459-1627 placement
function catalogAuthKind(r) {
  switch (r.kind) {
    case "account":
    case "token":
      return "oauth";
    case "api_key":
      return "api_key";
    case "profile":
      return "profile";
    case "federation":
      return "federation";
  }
}
//@ chunk-ynfp53zr.js:1627-2076 placement
/**
 * 判断两个目录作用域是否相同（账号、令牌、API key 等类型分别比较）。
 */
function isSameCatalogScope(r, e) {
  if (r === null || e === null) return false;
  switch (r.kind) {
    case "account":
      return e.kind === "account" && r.orgUuid === e.orgUuid && r.accountScope === e.accountScope;
    case "token":
      return e.kind === "token" && r.tokenScope === e.tokenScope;
    case "api_key":
      return e.kind === "api_key" && r.keyScope === e.keyScope;
    case "profile":
      return e.kind === "profile" && r.profileScope === e.profileScope;
    case "federation":
      return e.kind === "federation" && r.federationScope === e.federationScope;
  }
}
//@ chunk-ynfp53zr.js:2076-2433 placement
/**
 * 按目录作用域（账号、令牌、API key）计算模型目录缓存文件路径。
 */
function catalogCacheFilePath(r, e) {
  switch (r.kind) {
    case "account":
      return join(modelCatalogCacheDir(), `${r.orgUuid}-${r.accountScope}-${e}.json`);
    case "token":
      return join(modelCatalogCacheDir(), `tok-${r.tokenScope}-${e}.json`);
    case "api_key":
      return join(modelCatalogCacheDir(), `key-${r.keyScope}-${e}.json`);
    case "profile":
      return join(modelCatalogCacheDir(), `prof-${r.profileScope}-${e}.json`);
    case "federation":
      return join(modelCatalogCacheDir(), `fed-${r.federationScope}-${e}.json`);
  }
}
//@ chunk-ynfp53zr.js:2433-2477 placement
/**
 * 按宿主的已服务目录缓存表。
 */
function servedCatalogCache() {
  return getProviderState().servedCatalogByKey;
}
//@ chunk-ynfp53zr.js:2477-2764 placement
function catalogCacheKey(r, e) {
  switch (r.kind) {
    case "account":
      return `${r.orgUuid}:${r.accountScope}:${e}`;
    case "token":
      return `tok:${r.tokenScope}:${e}`;
    case "api_key":
      return `key:${r.keyScope}:${e}`;
    case "profile":
      return `prof:${r.profileScope}:${e}`;
    case "federation":
      return `fed:${r.federationScope}:${e}`;
  }
}
//@ chunk-ynfp53zr.js:2764-2815 placement
/**
 * 取某作用域的缓存条目。
 */
function getCachedCatalogEntry(r, e) {
  return servedCatalogCache().get(catalogCacheKey(r, e)) ?? undefined;
}
//@ chunk-ynfp53zr.js:2815-2830 placement
/**
 * 缓存文件的最大字节数。
 */
var MAX_CACHE_FILE_BYTES = ETAG_RE + 4096;
//@ chunk-ynfp53zr.js:2830-3181 placement
/**
 * 读取模型目录缓存文件（限制大小），文件不存在时静默返回 undefined。
 */
async function readCatalogCacheFile(r) {
  let e;
  try {
    e = await maskStorage().readRange(r, 0, MAX_CACHE_FILE_BYTES + 1);
  } catch (error) {
    if (!isENOENT(error))
      logForDebugging(`[servedCatalog] cache read failed: ${getErrnoCode(error) ?? "unknown"}`);
    return;
  }
  if (e.length > MAX_CACHE_FILE_BYTES) {
    logForDebugging("[servedCatalog] cache file oversized");
    return "invalid";
  }
  let n = servedCatalogCacheSchema().safeParse(safeParseJSON(e.toString("utf8"), false));
  if (!n.success) {
    logForDebugging("[servedCatalog] cache file invalid");
    return "invalid";
  }
  return n.data;
}
//@ chunk-ynfp53zr.js:3181-3524 placement
/**
 * 读取指定作用域与 surface 的目录缓存：先查内存，再读磁盘文件；文件无效或 surface 不符时删除缓存。
 */
async function loadCachedCatalog(r, e) {
  let n = catalogCacheKey(r, e);
  let a = servedCatalogCache().get(n);
  if (a !== undefined) return a ?? undefined;
  let catalogCacheFile = await readCatalogCacheFile(catalogCacheFilePath(r, e));
  if (catalogCacheFile === undefined) {
    servedCatalogCache().set(n, null);
    return;
  }
  if (
    catalogCacheFile === "invalid" ||
    (catalogCacheFile.catalog !== null && catalogCacheFile.catalog.surface !== e)
  ) {
    logForDebugging(
      `[servedCatalog] cache file ${catalogCacheFile === "invalid" ? "invalid" : "holds another surface"}, discarding`,
    );
    await discardCachedCatalog(r, e);
    return;
  }
  await saveCacheEntry(n, catalogCacheFile);
  return catalogCacheFile;
}
//@ chunk-ynfp53zr.js:3524-3683 placement
async function discardCachedCatalog(r, e) {
  servedCatalogCache().set(catalogCacheKey(r, e), null);
  try {
    await maskStorage().delete(catalogCacheFilePath(r, e));
  } catch (error) {
    if (!isENOENT(error))
      logForDebugging(`[servedCatalog] cache delete failed: ${getErrnoCode(error) ?? "unknown"}`);
  }
}
//@ chunk-ynfp53zr.js:3683-3873 placement
async function saveCachedCatalog(scope, surface, n) {
  await saveCacheEntry(catalogCacheKey(scope, surface), n);
  try {
    let a = maskStorage();
    await a.mkdir(modelCatalogCacheDir());
    await a.atomicWrite(catalogCacheFilePath(scope, surface), jsonStringify(n), 384);
  } catch (error) {
    logForDebugging(`[servedCatalog] cache write failed: ${getErrnoCode(error) ?? "unknown"}`);
  }
}
//@ chunk-ynfp53zr.js:3873-3948 placement
/**
 * 保存缓存条目并登记掩码 id。
 */
async function saveCacheEntry(r, e) {
  storeCacheEntry(r, e);
  if (e.catalog !== null) await addMaskedIds(getMaskedIdSet(e.catalog));
}
//@ chunk-ynfp53zr.js:3948-4012 placement
/**
 * 写入内存缓存并记录掩码 id。
 */
function storeCacheEntry(r, e) {
  servedCatalogCache().set(r, e);
  if (e.catalog !== null) recordMaskedFromCatalog(e.catalog);
}
//@ chunk-ynfp53zr.js:4012-4283 placement
function buildCatalogCacheEntry({
  catalog,
  etag,
  organizationUuid,
  resolution,
  now = Date.now(),
  random = Math.random(),
}) {
  return {
    version: CACHE_VERSION,
    fetchedAt: now,
    staleAt: computeStaleAt(now, random),
    ...(etag !== undefined &&
      (catalog === null || !hasDroppedModels(catalog)) && {
        etag,
      }),
    ...(organizationUuid !== undefined && {
      organizationUuid,
    }),
    ...(resolution !== undefined && {
      resolution,
    }),
    catalog,
  };
}
//@ chunk-ynfp53zr.js:4283-4368 placement
/**
 * 给条目补上获取时间与过期时间。
 */
function withFetchTimes(r, e = Date.now(), n = Math.random()) {
  return {
    ...r,
    fetchedAt: e,
    staleAt: computeStaleAt(e, n),
  };
}
//@ chunk-ynfp53zr.js:4368-4404 placement
/**
 * 计算过期时间（带抖动）。
 */
function computeStaleAt(r, e) {
  return r + jitteredTtl(CACHE_TTL_MS, e);
}
//@ chunk-ynfp53zr.js:4404-4511 placement
function isCatalogCacheStale(cachedCatalog, e = Date.now()) {
  let n = cachedCatalog.fetchedAt + CACHE_TTL_MS * (1 + STALE_JITTER_RATIO);
  return e < cachedCatalog.fetchedAt || e >= cachedCatalog.staleAt || cachedCatalog.staleAt > n;
}
//@ chunk-ynfp53zr.js:4511-4556 placement
/**
 * 默认的委托模式（off）。
 */
var TENGU_DELEGATED_QUAIL = "tengu_delegated_quail";
var DEFAULT_DELEGATED_MODE = {
  mode: "off",
};
//@ chunk-ynfp53zr.js:4556-4896 placement
function servedModelCatalogEligibility({ skipEssentialTrafficGate: r = false } = {}) {
  if (isEnvDefinedFalsy(env.CLAUDE_CODE_MODEL_CATALOG)) return "env_off";
  if (isBareMode()) return "bare";
  if (!r && isEssentialTrafficOnly()) return "essential_traffic";
  if (env.ANTHROPIC_UNIX_SOCKET) return "unix_socket";
  if (!isFirstPartyApiBackend()) return "not_first_party";
  let catalogScope = resolveCatalogScope();
  if (catalogScope.scope === null) return catalogScope.reason;
  if (!isPolicyAllowed("allow_model_catalog")) return "policy";
  return null;
}
//@ chunk-ynfp53zr.js:4896-4960 placement
/**
 * 服务端目录的模式（off 或按开关）。
 */
function servedCatalogMode() {
  if (servedModelCatalogEligibility() !== null) return "off";
  return delegatedQuailMode("served");
}
//@ chunk-ynfp53zr.js:4960-5022 placement
/**
 * 读 tengu_delegated_quail 并解析模式。
 */
function delegatedQuailMode(r) {
  let { value: e, source } = getFeatureValueWithSource_CACHED_MAY_BE_STALE(
    TENGU_DELEGATED_QUAIL,
    DEFAULT_DELEGATED_MODE,
  );
  return resolveMode(e, source, r);
}
//@ chunk-ynfp53zr.js:5022-5054 placement
/**
 * 解析目录模式。
 */
function resolveMode(r, source, n) {
  return resolveCatalogMode(r, n);
}
//@ chunk-ynfp53zr.js:5054-5249 placement
function resolveCatalogMode(r, e) {
  switch (readCatalogModeFlag(r, e)) {
    case "shadow":
      return "shadow";
    case "primary":
      return "primary";
    case "primary_fetch":
    case "primary_keep_picker":
      return e === "published" ? "primary" : "off";
    default:
      return "off";
  }
}
//@ chunk-ynfp53zr.js:5249-5463 placement
function readCatalogModeFlag(r, e) {
  if (r === null || typeof r !== "object") return;
  let n;
  if (e === "served") n = "served" in r ? r.served : undefined;
  else n = "published" in r ? r.published : undefined;
  if (typeof n === "string") return n;
  return "mode" in r ? r.mode : undefined;
}
//@ chunk-ynfp53zr.js:5463-5572 placement
function getCatalogOrgUuid() {
  let r = env.CLAUDE_CODE_ORGANIZATION_UUID ?? getOauthAccountInfo()?.organizationUuid;
  return normalizeUuidOrNull(r)?.toLowerCase() ?? null;
}
//@ chunk-ynfp53zr.js:5572-5581 placement
/**
 * 作用域哈希的字符数（12）。
 */
var SCOPE_HASH_CHARS = 12;
//@ chunk-ynfp53zr.js:5581-6032 placement
/**
 * 确定服务端模型目录的缓存/请求作用域：claude.ai 订阅者有账户与组织时用 account（账户 uuid 哈希前缀），环境变量/FD 令牌用 token 指纹，否则返回 null 与原因。
 */
function resolveCatalogScope() {
  if (!isClaudeAISubscriber()) return nonClaudeAiCatalogScope();
  let claudeAIOAuthTokenOrigin = getClaudeAIOAuthTokenOrigin();
  let e =
    claudeAIOAuthTokenOrigin === "store"
      ? normalizeUuidOrNull(getOauthAccountInfo()?.accountUuid)
      : normalizeUuidOrNull(env.CLAUDE_CODE_ACCOUNT_UUID);
  let catalogOrgUuid = getCatalogOrgUuid();
  if (e !== null && catalogOrgUuid !== null)
    return {
      scope: {
        kind: "account",
        orgUuid: catalogOrgUuid,
        accountScope: computeContentHash(e.toLowerCase()).slice(0, SCOPE_HASH_CHARS),
      },
    };
  switch (claudeAIOAuthTokenOrigin) {
    case "env":
    case "fd": {
      let claudeAIOAuthTokenFingerprint = getClaudeAIOAuthTokenFingerprint();
      if (claudeAIOAuthTokenFingerprint === null)
        return {
          scope: null,
          reason: "no_account",
        };
      return {
        scope: {
          kind: "token",
          tokenScope: claudeAIOAuthTokenFingerprint.slice(0, SCOPE_HASH_CHARS),
        },
      };
    }
    case "store":
    case "none":
      return {
        scope: null,
        reason: catalogOrgUuid === null ? "no_org" : "no_account",
      };
  }
}
//@ chunk-ynfp53zr.js:6032-6169 placement
function nonClaudeAiCatalogScope() {
  if (false)
    switch (r) {
      case "none":
      case "ANTHROPIC_API_KEY":
      case "/login managed key":
    }
  return {
    scope: null,
    reason: "not_claude_ai_auth",
  };
}
//@ chunk-ynfp53zr.js:6169-6534 placement
/**
 * 判断当前生效的凭据类型（third_party、host_token、claudeai_login、auth_token_env、api_key_env/login/helper、WIF profile 或 none），用于目录请求与遥测。
 */
function catalogCredentialKind() {
  if (!isFirstPartyApiBackend()) return "third_party";
  if (isClaudeAISubscriber())
    switch (getClaudeAIOAuthTokenOrigin()) {
      case "env":
      case "fd":
        return "host_token";
      case "store":
      case "none":
        return "claudeai_login";
    }
  if (effectiveAuthTokenEnv()) return "auth_token_env";
  switch (getAnthropicApiKeyFingerprint().source) {
    case "ANTHROPIC_API_KEY":
      return "api_key_env";
    case "/login managed key":
      return "api_key_login";
    case "apiKeyHelper":
      return "api_key_helper";
    case "none":
      return wifProfileCredentialKind() ?? "none";
  }
}
//@ chunk-ynfp53zr.js:6534-6638 placement
function wifProfileCredentialKind() {
  if (!shouldUseWIFAuth()) return null;
  return getWIFAuthType() === "user_oauth" ? "profile_user_oauth" : "profile_federation";
}
//@ chunk-ynfp53zr.js:6638-6670 placement
/**
 * 当前目录作用域。
 */
function catalogScope() {
  return resolveCatalogScope().scope;
}
//@ chunk-ynfp53zr.js:6670-6751 placement
/**
 * 当前目录的入口类型（cc/ccd/ccr）。
 */
function catalogSurface() {
  if (env.CLAUDE_CODE_REMOTE) return "ccr";
  if (isHostEntrypoint()) return "ccd";
  return "cc";
}
//@ chunk-c0w5a81j.js:1260-3112 placement = fetchTeamMemoryOnce (0.268)
async function fetchServedCatalogOnce(state, repoSlug, { etag: o } = {}) {
  let endpoint = catalogEndpointForScope(state);
  try {
    let modelSelector = fetchModelSelector(state, repoSlug);
    let s = {
      ...modelSelector.headers,
      ...(o !== undefined && {
        "If-None-Match": o,
      }),
    };
    let response = await apiClient.get(modelSelector.path, {
      auth: modelSelector.auth,
      isBackground: true,
      timeout: DEFAULT_OUTPUT_TOKENS,
      maxContentLength: ETAG_RE,
      validateStatus: () => true,
      ...(Object.keys(s).length > 0 && {
        headers: s,
      }),
    });
    if (!response.ok) {
      logForDebugging(
        `[servedCatalog] fetch (${endpoint}) skipped: ${response.reason}${response.reason === "no-auth" ? ` (${response.detail})` : ""}`,
      );
      return {
        status: "skipped",
        reason: response.reason,
      };
    }
    let status = response.status;
    if (status === 304 && o !== undefined) {
      logForDebugging(`[servedCatalog] fetch (${endpoint}): not modified`);
      return {
        status: "not_modified",
        httpStatus: status,
      };
    }
    if (status < 200 || status >= 300) {
      let m = classifyRefusal(state, status, response.data);
      logForDebugging(`[servedCatalog] fetch (${endpoint}): HTTP ${status}${formatRefusalSuffix(m)}`);
      return (
        m ?? {
          status: "error",
          reason: "http_status",
          httpStatus: status,
        }
      );
    }
    let parsed = catalogDocumentSchema().safeParse(response.data);
    if (!parsed.success) {
      logForDebugging(`[servedCatalog] fetch (${endpoint}): response failed validation`);
      return {
        status: "error",
        reason: "parse_failed",
        httpStatus: status,
      };
    }
    let etag = validEtagOrUndefined(response.response?.headers);
    let S = endpoint === "orgless" ? parseCatalogResolution(parsed.data) : {};
    let selectorSurface = getSelectorSurface(parsed.data, repoSlug);
    if (selectorSurface === null) {
      logForDebugging(
        `[servedCatalog] fetch (${endpoint}) ok: surface not served${formatResolutionSuffix(S)}`,
      );
      return {
        status: "empty",
        etag,
        httpStatus: status,
        ...S,
      };
    }
    if (hasDroppedModels(selectorSurface)) {
      logForDebugging(
        `[servedCatalog] fetch (${endpoint}) ok: ${selectorSurface.config.models?.length ?? 0} rows kept after row validation dropped others; etag withheld, full refetch next refresh${formatResolutionSuffix(S)}`,
      );
      return {
        status: "ok",
        catalog: selectorSurface,
        etag: undefined,
        httpStatus: status,
        ...S,
      };
    }
    logForDebugging(
      `[servedCatalog] fetch (${endpoint}) ok: ${selectorSurface.config.models?.length ?? 0} rows${formatResolutionSuffix(S)}`,
    );
    return {
      status: "ok",
      catalog: selectorSurface,
      etag,
      httpStatus: status,
      ...S,
    };
  } catch (error) {
    let { kind, status } = classifyAxiosError(error);
    switch (
      (logForDebugging(
        `[servedCatalog] fetch (${endpoint}) failed: ${kind}${status !== undefined ? ` ${status}` : ""}`,
      ),
      kind)
    ) {
      case "timeout":
        return {
          status: "error",
          reason: "timeout",
        };
      case "network":
        return {
          status: "error",
          reason: "network",
        };
      case "auth":
      case "http":
        return status === undefined
          ? {
              status: "error",
              reason: "network",
            }
          : (classifyRefusal(state, status, responseData(error)) ?? {
              status: "error",
              reason: "http_status",
              httpStatus: status,
            });
      case "other":
        return {
          status: "error",
          reason: "exception",
        };
    }
  }
}
export {
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
  getCachedCatalogEntry,
  delegatedQuailMode,
};
