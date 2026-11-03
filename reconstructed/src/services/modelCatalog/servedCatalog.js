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
import { u, T, E, o, U } from "../../../vendor/zod/v4/classic/schemas.js";
import {
  isValidEtag,
  xpr,
  Rpr,
  swi,
  vCn,
  M3t,
  pto,
  getSelectorSurface,
} from "../../utils/model/modelCatalog/servedCatalog.js";
import { Vt } from "../../utils/agentId.js";
import { hasDroppedModels, getMaskedIdSet, SCn } from "../../utils/model/modelCatalog/catalogEntries.js";
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
  Re,
  Z,
  formatRefusalSuffix,
  xe,
  parseCatalogResolution,
  formatResolutionSuffix,
  $e,
} from "../../utils/model/servedModelCatalog.js";
import { apiClient } from "../routines/routinesApi.js";

//@ chunk-ynfp53zr.js:874-902 placement
var f = 2,
  l0r = 3600000,
  d0r = 0.1;
//@ chunk-ynfp53zr.js:902-957 placement
function GIo(r, e) {
  return Math.round(r * (1 + d0r * (2 * e - 1)));
}
/**
 * 服务端模型目录缓存的 schema：版本、获取时间、过期时间、etag、组织等。
 */
//@ chunk-ynfp53zr.js:957-1328 placement
var servedCatalogCacheSchema = DoctorLazy(() =>
  u({
    version: T(f),
    fetchedAt: E(),
    staleAt: E(),
    etag: o().refine(isValidEtag).optional(),
    organizationUuid: o()
      .refine((e) => Vt(e)?.toLowerCase() === e)
      .optional(),
    resolution: U(xpr).optional(),
    catalog: u({ surface: U(Rpr), config: swi(), state: vCn().optional() }).nullable(),
  }).transform((e) => {
    if (e.etag === void 0 || e.catalog === null || !hasDroppedModels(e.catalog)) return e;
    let { etag: etag, ...a } = e;
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
/**
 * 判断两个目录作用域是否相同（账号、令牌、API key 等类型分别比较）。
 */
//@ chunk-ynfp53zr.js:1627-2076 placement
function isSameCatalogScope(r, e) {
  if (r === null || e === null) return !1;
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
/**
 * 按目录作用域（账号、令牌、API key）计算模型目录缓存文件路径。
 */
//@ chunk-ynfp53zr.js:2076-2433 placement
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
function d() {
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
function Djs(r, e) {
  return d().get(catalogCacheKey(r, e)) ?? void 0;
}
//@ chunk-ynfp53zr.js:2815-2830 placement
var s = M3t + 4096;
/**
 * 读取模型目录缓存文件（限制大小），文件不存在时静默返回 undefined。
 */
//@ chunk-ynfp53zr.js:2830-3181 placement
async function readCatalogCacheFile(r) {
  let e;
  try {
    e = await maskStorage().readRange(r, 0, s + 1);
  } catch (error) {
    if (!isENOENT(error))
      logForDebugging(`[servedCatalog] cache read failed: ${getErrnoCode(error) ?? "unknown"}`);
    return;
  }
  if (e.length > s) return (logForDebugging("[servedCatalog] cache file oversized"), "invalid");
  let safeParse = servedCatalogCacheSchema().safeParse(safeParseJSON(e.toString("utf8"), !1));
  if (!safeParse.success) return (logForDebugging("[servedCatalog] cache file invalid"), "invalid");
  return safeParse.data;
}
/**
 * 读取指定作用域与 surface 的目录缓存：先查内存，再读磁盘文件；文件无效或 surface 不符时删除缓存。
 */
//@ chunk-ynfp53zr.js:3181-3524 placement
async function loadCachedCatalog(r, e) {
  let n = catalogCacheKey(r, e),
    a = d().get(n);
  if (a !== void 0) return a ?? void 0;
  let c = await readCatalogCacheFile(catalogCacheFilePath(r, e));
  if (c === void 0) {
    d().set(n, null);
    return;
  }
  if (c === "invalid" || (c.catalog !== null && c.catalog.surface !== e)) {
    (logForDebugging(
      `[servedCatalog] cache file ${c === "invalid" ? "invalid" : "holds another surface"}, discarding`,
    ),
      await discardCachedCatalog(r, e));
    return;
  }
  return (await S(n, c), c);
}
//@ chunk-ynfp53zr.js:3524-3683 placement
async function discardCachedCatalog(r, e) {
  d().set(catalogCacheKey(r, e), null);
  try {
    await maskStorage().delete(catalogCacheFilePath(r, e));
  } catch (error) {
    if (!isENOENT(error))
      logForDebugging(`[servedCatalog] cache delete failed: ${getErrnoCode(error) ?? "unknown"}`);
  }
}
//@ chunk-ynfp53zr.js:3683-3873 placement
async function saveCachedCatalog(r, e, n) {
  await S(catalogCacheKey(r, e), n);
  try {
    let a = maskStorage();
    (await a.mkdir(modelCatalogCacheDir()),
      await a.atomicWrite(catalogCacheFilePath(r, e), jsonStringify(n), 384));
  } catch (error) {
    logForDebugging(`[servedCatalog] cache write failed: ${getErrnoCode(error) ?? "unknown"}`);
  }
}
//@ chunk-ynfp53zr.js:3873-3948 placement
async function S(r, e) {
  if ((A(r, e), e.catalog !== null)) await addMaskedIds(getMaskedIdSet(e.catalog));
}
//@ chunk-ynfp53zr.js:3948-4012 placement
function A(r, e) {
  if ((d().set(r, e), e.catalog !== null)) SCn(e.catalog);
}
//@ chunk-ynfp53zr.js:4012-4283 placement
function buildCatalogCacheEntry({
  catalog: catalog,
  etag: etag,
  organizationUuid: organizationUuid,
  resolution: resolution,
  now: now = Date.now(),
  random: random = Math.random(),
}) {
  return {
    version: f,
    fetchedAt: now,
    staleAt: g(now, random),
    ...(etag !== void 0 && (catalog === null || !hasDroppedModels(catalog)) && { etag: etag }),
    ...(organizationUuid !== void 0 && { organizationUuid: organizationUuid }),
    ...(resolution !== void 0 && { resolution: resolution }),
    catalog: catalog,
  };
}
//@ chunk-ynfp53zr.js:4283-4368 placement
function Hjs(r, e = Date.now(), n = Math.random()) {
  return { ...r, fetchedAt: e, staleAt: g(e, n) };
}
//@ chunk-ynfp53zr.js:4368-4404 placement
function g(r, e) {
  return r + GIo(l0r, e);
}
//@ chunk-ynfp53zr.js:4404-4511 placement
function isCatalogCacheStale(r, e = Date.now()) {
  let n = r.fetchedAt + l0r * (1 + d0r);
  return e < r.fetchedAt || e >= r.staleAt || r.staleAt > n;
}
//@ chunk-ynfp53zr.js:4511-4556 placement
var TENGU_DELEGATED_QUAIL = "tengu_delegated_quail",
  F = { mode: "off" };
//@ chunk-ynfp53zr.js:4556-4896 placement
function servedModelCatalogEligibility({ skipEssentialTrafficGate: r = !1 } = {}) {
  if (isEnvDefinedFalsy(env.CLAUDE_CODE_MODEL_CATALOG)) return "env_off";
  if (isBareMode()) return "bare";
  if (!r && isEssentialTrafficOnly()) return "essential_traffic";
  if (env.ANTHROPIC_UNIX_SOCKET) return "unix_socket";
  if (!isFirstPartyApiBackend()) return "not_first_party";
  let e = resolveCatalogScope();
  if (e.scope === null) return e.reason;
  if (!isPolicyAllowed("allow_model_catalog")) return "policy";
  return null;
}
//@ chunk-ynfp53zr.js:4896-4960 placement
function iHe() {
  if (servedModelCatalogEligibility() !== null) return "off";
  return zKn("served");
}
//@ chunk-ynfp53zr.js:4960-5022 placement
function zKn(r) {
  let { value: e, source: source } = getFeatureValueWithSource_CACHED_MAY_BE_STALE(TENGU_DELEGATED_QUAIL, F);
  return R(e, source, r);
}
//@ chunk-ynfp53zr.js:5022-5054 placement
function R(r, e, n) {
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
  if (e === "served") n = "served" in r ? r.served : void 0;
  else n = "published" in r ? r.published : void 0;
  if (typeof n === "string") return n;
  return "mode" in r ? r.mode : void 0;
}
//@ chunk-ynfp53zr.js:5463-5572 placement
function getCatalogOrgUuid() {
  let r = env.CLAUDE_CODE_ORGANIZATION_UUID ?? getOauthAccountInfo()?.organizationUuid;
  return Vt(r)?.toLowerCase() ?? null;
}
//@ chunk-ynfp53zr.js:5572-5581 placement
var C = 12;
/**
 * 确定服务端模型目录的缓存/请求作用域：claude.ai 订阅者有账户与组织时用 account（账户 uuid 哈希前缀），环境变量/FD 令牌用 token 指纹，否则返回 null 与原因。
 */
//@ chunk-ynfp53zr.js:5581-6032 placement
function resolveCatalogScope() {
  if (!isClaudeAISubscriber()) return nonClaudeAiCatalogScope();
  let r = getClaudeAIOAuthTokenOrigin(),
    e = r === "store" ? Vt(getOauthAccountInfo()?.accountUuid) : Vt(env.CLAUDE_CODE_ACCOUNT_UUID),
    n = getCatalogOrgUuid();
  if (e !== null && n !== null)
    return {
      scope: { kind: "account", orgUuid: n, accountScope: computeContentHash(e.toLowerCase()).slice(0, C) },
    };
  switch (r) {
    case "env":
    case "fd": {
      let a = getClaudeAIOAuthTokenFingerprint();
      if (a === null) return { scope: null, reason: "no_account" };
      return { scope: { kind: "token", tokenScope: a.slice(0, C) } };
    }
    case "store":
    case "none":
      return { scope: null, reason: n === null ? "no_org" : "no_account" };
  }
}
//@ chunk-ynfp53zr.js:6032-6169 placement
function nonClaudeAiCatalogScope() {
  if (!1)
    switch (r) {
      case "none":
      case "ANTHROPIC_API_KEY":
      case "/login managed key":
    }
  return { scope: null, reason: "not_claude_ai_auth" };
}
/**
 * 判断当前生效的凭据类型（third_party、host_token、claudeai_login、auth_token_env、api_key_env/login/helper、WIF profile 或 none），用于目录请求与遥测。
 */
//@ chunk-ynfp53zr.js:6169-6534 placement
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
function Toe() {
  return resolveCatalogScope().scope;
}
//@ chunk-ynfp53zr.js:6670-6751 placement
function nZ() {
  if (env.CLAUDE_CODE_REMOTE) return "ccr";
  if (isHostEntrypoint()) return "ccd";
  return "cc";
}
//@ chunk-c0w5a81j.js:1260-3112 placement = fetchTeamMemoryOnce (0.268)
async function fetchServedCatalogOnce(state, repoSlug, { etag: o } = {}) {
  let endpoint = catalogEndpointForScope(state);
  try {
    let n = fetchModelSelector(state, repoSlug),
      s = { ...n.headers, ...(o !== void 0 && { "If-None-Match": o }) },
      response = await apiClient.get(n.path, {
        auth: n.auth,
        isBackground: !0,
        timeout: Re,
        maxContentLength: M3t,
        validateStatus: () => !0,
        ...(Object.keys(s).length > 0 && { headers: s }),
      });
    if (!response.ok)
      return (
        logForDebugging(
          `[servedCatalog] fetch (${endpoint}) skipped: ${response.reason}${response.reason === "no-auth" ? ` (${response.detail})` : ""}`,
        ),
        { status: "skipped", reason: response.reason }
      );
    let status = response.status;
    if (status === 304 && o !== void 0)
      return (
        logForDebugging(`[servedCatalog] fetch (${endpoint}): not modified`),
        { status: "not_modified", httpStatus: status }
      );
    if (status < 200 || status >= 300) {
      let m = Z(state, status, response.data);
      return (
        logForDebugging(`[servedCatalog] fetch (${endpoint}): HTTP ${status}${formatRefusalSuffix(m)}`),
        m ?? { status: "error", reason: "http_status", httpStatus: status }
      );
    }
    let parsed = pto().safeParse(response.data);
    if (!parsed.success)
      return (
        logForDebugging(`[servedCatalog] fetch (${endpoint}): response failed validation`),
        { status: "error", reason: "parse_failed", httpStatus: status }
      );
    let u = xe(response.response?.headers),
      S = endpoint === "orgless" ? parseCatalogResolution(parsed.data) : {},
      v = getSelectorSurface(parsed.data, repoSlug);
    if (v === null)
      return (
        logForDebugging(
          `[servedCatalog] fetch (${endpoint}) ok: surface not served${formatResolutionSuffix(S)}`,
        ),
        { status: "empty", etag: u, httpStatus: status, ...S }
      );
    if (hasDroppedModels(v))
      return (
        logForDebugging(
          `[servedCatalog] fetch (${endpoint}) ok: ${v.config.models?.length ?? 0} rows kept after row validation dropped others; etag withheld, full refetch next refresh${formatResolutionSuffix(S)}`,
        ),
        { status: "ok", catalog: v, etag: void 0, httpStatus: status, ...S }
      );
    return (
      logForDebugging(
        `[servedCatalog] fetch (${endpoint}) ok: ${v.config.models?.length ?? 0} rows${formatResolutionSuffix(S)}`,
      ),
      { status: "ok", catalog: v, etag: u, httpStatus: status, ...S }
    );
  } catch (error) {
    let { kind: kind, status: status } = classifyAxiosError(error);
    switch (
      (logForDebugging(
        `[servedCatalog] fetch (${endpoint}) failed: ${kind}${status !== void 0 ? ` ${status}` : ""}`,
      ),
      kind)
    ) {
      case "timeout":
        return { status: "error", reason: "timeout" };
      case "network":
        return { status: "error", reason: "network" };
      case "auth":
      case "http":
        return status === void 0
          ? { status: "error", reason: "network" }
          : (Z(state, status, $e(error)) ?? { status: "error", reason: "http_status", httpStatus: status });
      case "other":
        return { status: "error", reason: "exception" };
    }
  }
}

export {
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
  Djs,
  zKn,
};
