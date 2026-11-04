/**
 * services/gateway/gatewayDiscovery.ts
 *
 * 2.1.316 新增：向网关发现可用模型并缓存（第一方/自定义 base URL 时跳过）；从存储读取网关模型列表缓存等。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-aepeg2w5.js (13)
 * attribution: placement 13
 */
import { join } from "path";
import { readFileSync } from "fs";
import { mkdir, writeFile } from "fs/promises";
import { DoctorLazy } from "../../cli/handlers/util.js";
import { objectSchema, stringSchema, numberSchema, array } from "../../../vendor/zod/v4/classic/schemas.js";
import { isDiskless, getIsNonInteractiveSession } from "../../bootstrap/state.js";
import { env } from "../../utils/env.js";
import {
  getAPIProvider,
  isFirstPartyAnthropicBaseUrl,
  assumesFirstPartyBaseUrl,
} from "../../utils/model/providers.js";
import { getClaudeConfigDir } from "../../utils/envUtils.js";
import { STORAGE_SPACES } from "../../utils/storage/storageSpaces.js";
import { safeParseJSON } from "../../utils/json.js";
import { getProviderState } from "../../utils/model/providerCaches.js";
import { logForDebugging } from "../../utils/debug.js";
import { sanitizeTitle, markdownSafeText } from "../../utils/resultError.js";
import { truncateAtWord } from "../../utils/stringUtils.js";
import {
  isApiKeyHelperSafeToInvoke,
  getApiKeyFromApiKeyHelper,
  getAnthropicApiKeySafe,
  getAnthropicApiKeyWithSourceSafe,
} from "../../utils/auth.js";
import { getCustomHeaders } from "../api/client.js";
import { claudeCodeUserAgent } from "../../utils/http.js";
import { validateAuthHeaders, InvalidRequestHeaderValueError } from "../api/requestHeaders.js";
import { getProxyFetchOptions } from "../../utils/proxy.js";
import { getTLSFetchOptions } from "../../utils/mtls.js";
import { withoutSensitiveHeaders } from "../../utils/anthropicHosts.js";
import { isStorageV5Enabled } from "../../utils/hoverRest.js";
import { import_sortedIndex_2 } from "../../../vendor/lodash-es/_inlinedHelpers.js";
import { jsonStringify } from "../../utils/slowOperations.js";
import { redactInvalidHeaderValues } from "../../utils/errorRedaction.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-aepeg2w5.js:399969-400128 placement
/**
 * 网关模型发现用的常量与 schema（超时、描述长度上限、模型条目与缓存文件的 zod schema）；与错误遮盖无关，应归 services/gateway/gatewayDiscovery.js。
 */
var GATEWAY_DISCOVERY_TIMEOUT_MS; // deferred: uses DoctorLazy (../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
var gatewayModelSchema;
var GATEWAY_MODEL_DESCRIPTION_MAX;
var gatewayModelCacheSchema;
deferInit("chunk-aepeg2w5.js:399969", () => {
  GATEWAY_DISCOVERY_TIMEOUT_MS = 3000;
  gatewayModelSchema = DoctorLazy(() =>
    objectSchema({
      id: stringSchema(),
      display_name: stringSchema().optional(),
      description: stringSchema().nullish(),
    }).strip(),
  );
  GATEWAY_MODEL_DESCRIPTION_MAX = 100;
  gatewayModelCacheSchema = DoctorLazy(() =>
    objectSchema({
      baseUrl: stringSchema(),
      fetchedAt: numberSchema(),
      models: array(gatewayModelSchema()),
    }),
  );
});
//@ chunk-aepeg2w5.js:400128-400308 placement
function isGatewayModelDiscoveryEnabled() {
  if (isDiskless()) return false;
  if (!env.CLAUDE_CODE_ENABLE_GATEWAY_MODEL_DISCOVERY) return false;
  if (getAPIProvider() !== "firstParty") return false;
  if (isFirstPartyAnthropicBaseUrl()) return false;
  if (!env.ANTHROPIC_BASE_URL) return false;
  return true;
}
//@ chunk-aepeg2w5.js:400308-400346 placement = getCacheDir (1)
/**
 * ~/.claude/cache。覆盖后缀名 getCacheDir_3。
 */
function getCacheDir() {
  return join(getClaudeConfigDir(), "cache");
}
//@ chunk-aepeg2w5.js:400346-400398 placement
/**
 * ~/.claude/cache/gateway-models.json（网关模型发现缓存）。
 */
function getGatewayModelsCachePath() {
  return join(getCacheDir(), "gateway-models.json");
}
//@ chunk-aepeg2w5.js:400398-400468 placement
/**
 * 网关模型缓存的存储键（gateway-models.json）。
 */
function gatewayModelCacheKey() {
  return STORAGE_SPACES.cache("gateway-models", "gateway-models.json");
}
//@ chunk-aepeg2w5.js:400468-400543 placement
/**
 * 解析网关模型缓存文件，解析失败返回 null。
 */
function parseGatewayModelCache(text) {
  let parsed = gatewayModelCacheSchema().safeParse(safeParseJSON(text, false));
  return parsed.success ? parsed.data : null;
}
//@ chunk-aepeg2w5.js:400543-400594 placement
/**
 * 按宿主保存的网关模型选项缓存表。
 */
function gatewayModelCacheMap() {
  return getProviderState().gatewayModelsByCachePath;
}
//@ chunk-aepeg2w5.js:400594-400772 placement
function readGatewayModelsCache(gatewayModelsCachePath, path = getProviderState().gatewayModelsStorageV5) {
  let cache = gatewayModelCacheMap();
  if (cache.has(gatewayModelsCachePath)) return cache.get(gatewayModelsCachePath) ?? null;
  if (path) return null;
  let text;
  try {
    let file = readFileSync(gatewayModelsCachePath, "utf-8");
    text = parseGatewayModelCache(file);
  } catch {
    text = null;
  }
  cache.set(gatewayModelsCachePath, text);
  return text;
}
//@ chunk-aepeg2w5.js:400772-401172 placement
/**
 * 从存储读取网关模型列表缓存。
 */
async function primeGatewayModels(baseUrl) {
  if (!baseUrl || !isGatewayModelDiscoveryEnabled()) return;
  let gatewayModelsCachePath = getGatewayModelsCachePath();
  if (gatewayModelCacheMap().has(gatewayModelsCachePath)) return;
  let cache = await baseUrl.read([gatewayModelCacheKey()]);
  if (!cache.ok) {
    logForDebugging(`[gatewayDiscovery] prime read failed: ${cache.error.code}`);
    return;
  }
  let result = cache.value.items[0];
  if (!result.found) return;
  let gatewayModelCache = parseGatewayModelCache(Buffer.from(result.value).toString("utf-8"));
  if (gatewayModelCache === null) return;
  let providerState = getProviderState();
  if (!providerState.gatewayModelsByCachePath.has(gatewayModelsCachePath))
    providerState.gatewayModelsByCachePath.set(gatewayModelsCachePath, gatewayModelCache);
  providerState.gatewayModelsStorageV5 = baseUrl;
}
//@ chunk-aepeg2w5.js:401172-401191 placement
var weakMap_3; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-aepeg2w5.js:401172", () => {
  weakMap_3 = new WeakMap();
});
//@ chunk-aepeg2w5.js:401191-401476 placement
/**
 * 网关提供的模型选项（来自发现缓存）。
 */
function getGatewayModelOptions() {
  if (!isGatewayModelDiscoveryEnabled()) return [];
  let gatewayModelsCache = readGatewayModelsCache(getGatewayModelsCachePath());
  if (!gatewayModelsCache || gatewayModelsCache.baseUrl !== env.ANTHROPIC_BASE_URL) return [];
  let cache = weakMap_3.get(gatewayModelsCache);
  if (cache) return cache;
  let mapped = gatewayModelsCache.models.map((model) => ({
    value: model.id,
    label: sanitizeTitle(model.display_name ?? "") || sanitizeTitle(model.id),
    description:
      truncateAtWord(markdownSafeText(model.description ?? ""), GATEWAY_MODEL_DESCRIPTION_MAX) ||
      "From gateway",
  }));
  weakMap_3.set(gatewayModelsCache, mapped);
  return mapped;
}
//@ chunk-aepeg2w5.js:401476-401548 placement
/**
 * 判断一个模型选项的值与标签是否自洽（标签是清洗后的值）。
 */
function isSanitizedModelOption(option) {
  return typeof option.value === "string" && option.label === sanitizeTitle(option.value);
}
//@ chunk-aepeg2w5.js:401548-404666 placement
/**
 * 向网关发现可用模型并缓存（第一方/自定义 base URL 时跳过）。
 */
async function discoverGatewayModels(storageV5) {
  if (!isGatewayModelDiscoveryEnabled()) {
    if (env.CLAUDE_CODE_ENABLE_GATEWAY_MODEL_DISCOVERY) {
      let apiProvider = getAPIProvider();
      logForDebugging(
        `[gatewayDiscovery] skipped: ${apiProvider !== "firstParty" ? `provider is ${apiProvider}` : assumesFirstPartyBaseUrl() ? "the base URL is asserted to be the Anthropic API" : env.ANTHROPIC_BASE_URL ? "ANTHROPIC_BASE_URL is a first-party host" : "ANTHROPIC_BASE_URL is unset"}`,
      );
    }
    return;
  }
  let timeoutMs = env.CLAUDE_CODE_GATEWAY_MODEL_DISCOVERY_TIMEOUT_MS ?? GATEWAY_DISCOVERY_TIMEOUT_MS;
  try {
    let ANTHROPIC_BASE_URL = env.ANTHROPIC_BASE_URL;
    if (!ANTHROPIC_BASE_URL) return;
    let ANTHROPIC_AUTH_TOKEN = env.ANTHROPIC_AUTH_TOKEN;
    let helperSafe = isApiKeyHelperSafeToInvoke();
    let helperKey =
      ANTHROPIC_AUTH_TOKEN || !helperSafe
        ? undefined
        : (await getApiKeyFromApiKeyHelper(getIsNonInteractiveSession()))?.trim();
    let authToken = ANTHROPIC_AUTH_TOKEN || helperKey;
    let apiKey = getAnthropicApiKeySafe()?.trim() || helperKey;
    if (!authToken && !apiKey) {
      logForDebugging(
        helperSafe
          ? "[gatewayDiscovery] skipped: no credential (ANTHROPIC_AUTH_TOKEN, apiKeyHelper, or API key)"
          : "[gatewayDiscovery] skipped: apiKeyHelper requires workspace trust",
      );
      return;
    }
    let customHeaders = Object.fromEntries(getCustomHeaders().filter(([, headerValue]) => headerValue));
    let headers = {
      ...(authToken && {
        Authorization: `Bearer ${authToken}`,
      }),
      ...(apiKey && {
        "x-api-key": apiKey,
      }),
      "anthropic-version": "2023-06-01",
      "User-Agent": claudeCodeUserAgent(),
    };
    for (let [key, value] of Object.entries(customHeaders)) {
      for (let key_2 of Object.keys(headers))
        if (key_2.toLowerCase() === key.toLowerCase()) delete headers[key_2];
      headers[key] = value;
    }
    let keys = Object.keys(customHeaders);
    let customLower = new Set(keys.map((headerName) => headerName.toLowerCase()));
    validateAuthHeaders({
      apiKey: customLower.has("x-api-key") ? null : apiKey || null,
      getApiKeySource: () => {
        let { source } = getAnthropicApiKeyWithSourceSafe({
          skipRetrievingKeyFromApiKeyHelper: true,
        });
        return source !== "none" ? source : helperKey ? "apiKeyHelper" : "unknown";
      },
      authToken: null,
      getAuthTokenSource: () => "unknown",
      defaultHeaders: headers,
      authorizationSource:
        !authToken || customLower.has("authorization")
          ? null
          : ANTHROPIC_AUTH_TOKEN
            ? "ANTHROPIC_AUTH_TOKEN"
            : "apiKeyHelper",
      customHeaderNames: keys,
      envSuppliedHeaderNames: new Set(),
    });
    let modelsUrl = `${ANTHROPIC_BASE_URL.replace(/\/+$/, "")}/v1/models?limit=1000`;
    let response = await fetch(modelsUrl, {
      method: "GET",
      headers,
      redirect: "error",
      signal: AbortSignal.timeout(timeoutMs),
      ...getProxyFetchOptions({
        url: modelsUrl,
      }),
      ...getTLSFetchOptions(withoutSensitiveHeaders(modelsUrl, headers)),
    });
    if (!response.ok) {
      logForDebugging(`[gatewayDiscovery] non-OK status ${response.status}`);
      return;
    }
    let body = await response.json();
    let validated = objectSchema({
      data: array(gatewayModelSchema()),
    }).safeParse(body);
    if (!validated.success) {
      logForDebugging("[gatewayDiscovery] response body failed validation");
      return;
    }
    let filtered = validated.data.data.filter((model) => /(claude|anthropic)/i.test(model.id));
    if (filtered.length === 0) {
      logForDebugging("[gatewayDiscovery] 0 usable models after filter");
      return;
    }
    let gatewayModelsCachePath = getGatewayModelsCachePath();
    if (isStorageV5Enabled() && storageV5 !== undefined) {
      let cacheRead = await storageV5.read([gatewayModelCacheKey()]);
      let cached =
        cacheRead.ok && cacheRead.value.items[0]?.found
          ? parseGatewayModelCache(Buffer.from(cacheRead.value.items[0].value).toString("utf-8"))
          : null;
      if (!cacheRead.ok) logForDebugging(`[gatewayDiscovery] cache read failed: ${cacheRead.error.code}`);
      else gatewayModelCacheMap().set(gatewayModelsCachePath, cached);
      if (cached && cached.baseUrl === ANTHROPIC_BASE_URL && import_sortedIndex_2(cached.models, filtered))
        return;
      let cacheJson = jsonStringify({
        baseUrl: ANTHROPIC_BASE_URL,
        fetchedAt: Date.now(),
        models: filtered,
      });
      try {
        await mkdir(getCacheDir(), {
          recursive: true,
        });
      } catch (error) {
        logForDebugging(
          `[gatewayDiscovery] cache folder could not be made: ${error instanceof Error ? error.message : "unknown"}`,
        );
        return;
      }
      let writeResult = await storageV5.write(gatewayModelCacheKey(), cacheJson, {
        publishDiscipline: "inPlace",
        mode: 384,
      });
      if (!writeResult.ok) {
        logForDebugging(`[gatewayDiscovery] cache write failed: ${writeResult.error.code}`);
        return;
      }
      gatewayModelCacheMap().set(gatewayModelsCachePath, parseGatewayModelCache(cacheJson));
      logForDebugging(`[gatewayDiscovery] cached ${filtered.length} models`);
      return;
    }
    let gatewayModelsCache = readGatewayModelsCache(gatewayModelsCachePath);
    if (
      gatewayModelsCache &&
      gatewayModelsCache.baseUrl === ANTHROPIC_BASE_URL &&
      import_sortedIndex_2(gatewayModelsCache.models, filtered)
    )
      return;
    await mkdir(getCacheDir(), {
      recursive: true,
    });
    await writeFile(
      gatewayModelsCachePath,
      jsonStringify({
        baseUrl: ANTHROPIC_BASE_URL,
        fetchedAt: Date.now(),
        models: filtered,
      }),
      {
        encoding: "utf-8",
        mode: 384,
      },
    );
    gatewayModelCacheMap().delete(gatewayModelsCachePath);
    logForDebugging(`[gatewayDiscovery] cached ${filtered.length} models`);
  } catch (error) {
    logForDebugging(
      error instanceof InvalidRequestHeaderValueError
        ? `[gatewayDiscovery] skipped: ${error.message}`
        : `[gatewayDiscovery] failed: ${error instanceof Error ? (error.name === "TimeoutError" ? `timed out after ${timeoutMs}ms` : redactInvalidHeaderValues(error.message)) : "unknown"}`,
    );
  }
}
export { primeGatewayModels, discoverGatewayModels, getGatewayModelOptions, isSanitizedModelOption };
