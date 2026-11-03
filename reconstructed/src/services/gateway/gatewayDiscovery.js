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
import { u, string, E, array } from "../../../vendor/zod/v4/classic/schemas.js";
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
import { En } from "../../../vendor/lodash-es/_inlinedHelpers.js";
import { jsonStringify } from "../../utils/slowOperations.js";
import { redactInvalidHeaderValues } from "../../utils/errorRedaction.js";

//@ chunk-aepeg2w5.js:399969-400128 placement
/**
 * 网关模型发现用的常量与 schema（超时、描述长度上限、模型条目与缓存文件的 zod schema）；与错误遮盖无关，应归 services/gateway/gatewayDiscovery.js。
 */
var GATEWAY_DISCOVERY_TIMEOUT_MS = 3000;
var gatewayModelSchema = DoctorLazy(() =>
  u({
    id: string(),
    display_name: string().optional(),
    description: string().nullish(),
  }).strip(),
);
var GATEWAY_MODEL_DESCRIPTION_MAX = 100;
var gatewayModelCacheSchema = DoctorLazy(() =>
  u({
    baseUrl: string(),
    fetchedAt: E(),
    models: array(gatewayModelSchema()),
  }),
);
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
function parseGatewayModelCache(e) {
  let n = gatewayModelCacheSchema().safeParse(safeParseJSON(e, false));
  return n.success ? n.data : null;
}
//@ chunk-aepeg2w5.js:400543-400594 placement
/**
 * 按宿主保存的网关模型选项缓存表。
 */
function gatewayModelCacheMap() {
  return getProviderState().gatewayModelsByCachePath;
}
//@ chunk-aepeg2w5.js:400594-400772 placement
function readGatewayModelsCache(gatewayModelsCachePath, n = getProviderState().gatewayModelsStorageV5) {
  let r = gatewayModelCacheMap();
  if (r.has(gatewayModelsCachePath)) return r.get(gatewayModelsCachePath) ?? null;
  if (n) return null;
  let s;
  try {
    let file = readFileSync(gatewayModelsCachePath, "utf-8");
    s = parseGatewayModelCache(file);
  } catch {
    s = null;
  }
  r.set(gatewayModelsCachePath, s);
  return s;
}
//@ chunk-aepeg2w5.js:400772-401172 placement
/**
 * 从存储读取网关模型列表缓存。
 */
async function primeGatewayModels(e) {
  if (!e || !isGatewayModelDiscoveryEnabled()) return;
  let gatewayModelsCachePath = getGatewayModelsCachePath();
  if (gatewayModelCacheMap().has(gatewayModelsCachePath)) return;
  let r = await e.read([gatewayModelCacheKey()]);
  if (!r.ok) {
    logForDebugging(`[gatewayDiscovery] prime read failed: ${r.error.code}`);
    return;
  }
  let s = r.value.items[0];
  if (!s.found) return;
  let gatewayModelCache = parseGatewayModelCache(Buffer.from(s.value).toString("utf-8"));
  if (gatewayModelCache === null) return;
  let providerState = getProviderState();
  if (!providerState.gatewayModelsByCachePath.has(gatewayModelsCachePath))
    providerState.gatewayModelsByCachePath.set(gatewayModelsCachePath, gatewayModelCache);
  providerState.gatewayModelsStorageV5 = e;
}
//@ chunk-aepeg2w5.js:401172-401191 placement
var weakMap_3 = new WeakMap();
//@ chunk-aepeg2w5.js:401191-401476 placement
/**
 * 网关提供的模型选项（来自发现缓存）。
 */
function getGatewayModelOptions() {
  if (!isGatewayModelDiscoveryEnabled()) return [];
  let gatewayModelsCache = readGatewayModelsCache(getGatewayModelsCachePath());
  if (!gatewayModelsCache || gatewayModelsCache.baseUrl !== env.ANTHROPIC_BASE_URL) return [];
  let n = weakMap_3.get(gatewayModelsCache);
  if (n) return n;
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
function isSanitizedModelOption(e) {
  return typeof e.value === "string" && e.label === sanitizeTitle(e.value);
}
//@ chunk-aepeg2w5.js:401548-404666 placement
/**
 * 向网关发现可用模型并缓存（第一方/自定义 base URL 时跳过）。
 */
async function discoverGatewayModels(e) {
  if (!isGatewayModelDiscoveryEnabled()) {
    if (env.CLAUDE_CODE_ENABLE_GATEWAY_MODEL_DISCOVERY) {
      let apiProvider = getAPIProvider();
      logForDebugging(
        `[gatewayDiscovery] skipped: ${apiProvider !== "firstParty" ? `provider is ${apiProvider}` : assumesFirstPartyBaseUrl() ? "the base URL is asserted to be the Anthropic API" : env.ANTHROPIC_BASE_URL ? "ANTHROPIC_BASE_URL is a first-party host" : "ANTHROPIC_BASE_URL is unset"}`,
      );
    }
    return;
  }
  let n = env.CLAUDE_CODE_GATEWAY_MODEL_DISCOVERY_TIMEOUT_MS ?? GATEWAY_DISCOVERY_TIMEOUT_MS;
  try {
    let ANTHROPIC_BASE_URL = env.ANTHROPIC_BASE_URL;
    if (!ANTHROPIC_BASE_URL) return;
    let ANTHROPIC_AUTH_TOKEN = env.ANTHROPIC_AUTH_TOKEN;
    let h = isApiKeyHelperSafeToInvoke();
    let y =
      ANTHROPIC_AUTH_TOKEN || !h
        ? undefined
        : (await getApiKeyFromApiKeyHelper(getIsNonInteractiveSession()))?.trim();
    let S = ANTHROPIC_AUTH_TOKEN || y;
    let w = getAnthropicApiKeySafe()?.trim() || y;
    if (!S && !w) {
      logForDebugging(
        h
          ? "[gatewayDiscovery] skipped: no credential (ANTHROPIC_AUTH_TOKEN, apiKeyHelper, or API key)"
          : "[gatewayDiscovery] skipped: apiKeyHelper requires workspace trust",
      );
      return;
    }
    let R = Object.fromEntries(getCustomHeaders().filter(([, se]) => se));
    let x = {
      ...(S && {
        Authorization: `Bearer ${S}`,
      }),
      ...(w && {
        "x-api-key": w,
      }),
      "anthropic-version": "2023-06-01",
      "User-Agent": claudeCodeUserAgent(),
    };
    for (let [key, value] of Object.entries(R)) {
      for (let key_2 of Object.keys(x)) if (key_2.toLowerCase() === key.toLowerCase()) delete x[key_2];
      x[key] = value;
    }
    let keys = Object.keys(R);
    let F = new Set(keys.map((se) => se.toLowerCase()));
    validateAuthHeaders({
      apiKey: F.has("x-api-key") ? null : w || null,
      getApiKeySource: () => {
        let { source } = getAnthropicApiKeyWithSourceSafe({
          skipRetrievingKeyFromApiKeyHelper: true,
        });
        return source !== "none" ? source : y ? "apiKeyHelper" : "unknown";
      },
      authToken: null,
      getAuthTokenSource: () => "unknown",
      defaultHeaders: x,
      authorizationSource:
        !S || F.has("authorization") ? null : ANTHROPIC_AUTH_TOKEN ? "ANTHROPIC_AUTH_TOKEN" : "apiKeyHelper",
      customHeaderNames: keys,
      envSuppliedHeaderNames: new Set(),
    });
    let L = `${ANTHROPIC_BASE_URL.replace(/\/+$/, "")}/v1/models?limit=1000`;
    let response = await fetch(L, {
      method: "GET",
      headers: x,
      redirect: "error",
      signal: AbortSignal.timeout(n),
      ...getProxyFetchOptions({
        url: L,
      }),
      ...getTLSFetchOptions(withoutSensitiveHeaders(L, x)),
    });
    if (!response.ok) {
      logForDebugging(`[gatewayDiscovery] non-OK status ${response.status}`);
      return;
    }
    let body = await response.json();
    let ee = u({
      data: array(gatewayModelSchema()),
    }).safeParse(body);
    if (!ee.success) {
      logForDebugging("[gatewayDiscovery] response body failed validation");
      return;
    }
    let filtered = ee.data.data.filter((se) => /(claude|anthropic)/i.test(se.id));
    if (filtered.length === 0) {
      logForDebugging("[gatewayDiscovery] 0 usable models after filter");
      return;
    }
    let gatewayModelsCachePath = getGatewayModelsCachePath();
    if (isStorageV5Enabled() && e !== undefined) {
      let se = await e.read([gatewayModelCacheKey()]);
      let Se =
        se.ok && se.value.items[0]?.found
          ? parseGatewayModelCache(Buffer.from(se.value.items[0].value).toString("utf-8"))
          : null;
      if (!se.ok) logForDebugging(`[gatewayDiscovery] cache read failed: ${se.error.code}`);
      else gatewayModelCacheMap().set(gatewayModelsCachePath, Se);
      if (Se && Se.baseUrl === ANTHROPIC_BASE_URL && En(Se.models, filtered)) return;
      let ae = jsonStringify({
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
      let ie = await e.write(gatewayModelCacheKey(), ae, {
        publishDiscipline: "inPlace",
        mode: 384,
      });
      if (!ie.ok) {
        logForDebugging(`[gatewayDiscovery] cache write failed: ${ie.error.code}`);
        return;
      }
      gatewayModelCacheMap().set(gatewayModelsCachePath, parseGatewayModelCache(ae));
      logForDebugging(`[gatewayDiscovery] cached ${filtered.length} models`);
      return;
    }
    let gatewayModelsCache = readGatewayModelsCache(gatewayModelsCachePath);
    if (
      gatewayModelsCache &&
      gatewayModelsCache.baseUrl === ANTHROPIC_BASE_URL &&
      En(gatewayModelsCache.models, filtered)
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
        : `[gatewayDiscovery] failed: ${error instanceof Error ? (error.name === "TimeoutError" ? `timed out after ${n}ms` : redactInvalidHeaderValues(error.message)) : "unknown"}`,
    );
  }
}
export { primeGatewayModels, discoverGatewayModels, getGatewayModelOptions, isSanitizedModelOption };
