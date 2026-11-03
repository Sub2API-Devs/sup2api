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
import {
  join,
  join as join_2,
  join as join_3,
  join as join_4,
  join as join_5,
  join as join_6,
  join as join_7,
  join as join_8,
  join as join_9,
  join as join_10,
  join as join_11,
} from "path";
import { readFileSync, readFileSync as readFileSync_2, readFileSync as readFileSync_3 } from "fs";
import {
  mkdir,
  mkdir as mkdir_2,
  mkdir as mkdir_3,
  mkdir as mkdir_4,
  writeFile,
  writeFile as writeFile_2,
  writeFile as writeFile_3,
  writeFile as writeFile_4,
} from "fs/promises";
import { DoctorLazy } from "../../cli/handlers/util.js";
import { u, o, E, A } from "../../../vendor/zod/v4/classic/schemas.js";
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
import { Tp } from "../../utils/errorRedaction.js";

/**
 * 网关模型发现用的常量与 schema（超时、描述长度上限、模型条目与缓存文件的 zod schema）；与错误遮盖无关，应归 services/gateway/gatewayDiscovery.js。
 */
//@ chunk-aepeg2w5.js:399969-400128 placement
var GATEWAY_DISCOVERY_TIMEOUT_MS = 3000,
  gatewayModelSchema = DoctorLazy(() =>
    u({ id: o(), display_name: o().optional(), description: o().nullish() }).strip(),
  ),
  GATEWAY_MODEL_DESCRIPTION_MAX = 100,
  gatewayModelCacheSchema = DoctorLazy(() =>
    u({ baseUrl: o(), fetchedAt: E(), models: A(gatewayModelSchema()) }),
  );
//@ chunk-aepeg2w5.js:400128-400308 placement
function isGatewayModelDiscoveryEnabled() {
  if (isDiskless()) return !1;
  if (!env.CLAUDE_CODE_ENABLE_GATEWAY_MODEL_DISCOVERY) return !1;
  if (getAPIProvider() !== "firstParty") return !1;
  if (isFirstPartyAnthropicBaseUrl()) return !1;
  if (!env.ANTHROPIC_BASE_URL) return !1;
  return !0;
}
/**
 * ~/.claude/cache。覆盖后缀名 getCacheDir_3。
 */
//@ chunk-aepeg2w5.js:400308-400346 placement = getCacheDir (1)
function getCacheDir() {
  return join_7(getClaudeConfigDir(), "cache");
}
/**
 * ~/.claude/cache/gateway-models.json（网关模型发现缓存）。
 */
//@ chunk-aepeg2w5.js:400346-400398 placement
function getGatewayModelsCachePath() {
  return join_7(getCacheDir(), "gateway-models.json");
}
//@ chunk-aepeg2w5.js:400398-400468 placement
function Mp() {
  return STORAGE_SPACES.cache("gateway-models", "gateway-models.json");
}
//@ chunk-aepeg2w5.js:400468-400543 placement
function Mu(e) {
  let safeParse = gatewayModelCacheSchema().safeParse(safeParseJSON(e, !1));
  return safeParse.success ? safeParse.data : null;
}
//@ chunk-aepeg2w5.js:400543-400594 placement
function Ui() {
  return getProviderState().gatewayModelsByCachePath;
}
//@ chunk-aepeg2w5.js:400594-400772 placement
function readGatewayModelsCache(e, n = getProviderState().gatewayModelsStorageV5) {
  let r = Ui();
  if (r.has(e)) return r.get(e) ?? null;
  if (n) return null;
  let s;
  try {
    let h = readFileSync_2(e, "utf-8");
    s = Mu(h);
  } catch {
    s = null;
  }
  return (r.set(e, s), s);
}
/**
 * 从存储读取网关模型列表缓存。
 */
//@ chunk-aepeg2w5.js:400772-401172 placement
async function primeGatewayModels(e) {
  if (!e || !isGatewayModelDiscoveryEnabled()) return;
  let n = getGatewayModelsCachePath();
  if (Ui().has(n)) return;
  let read = await e.read([Mp()]);
  if (!read.ok) {
    logForDebugging(`[gatewayDiscovery] prime read failed: ${read.error.code}`);
    return;
  }
  let s = read.value.items[0];
  if (!s.found) return;
  let h = Mu(Buffer.from(s.value).toString("utf-8"));
  if (h === null) return;
  let y = getProviderState();
  if (!y.gatewayModelsByCachePath.has(n)) y.gatewayModelsByCachePath.set(n, h);
  y.gatewayModelsStorageV5 = e;
}
//@ chunk-aepeg2w5.js:401172-401191 placement
var weakMap_3 = new WeakMap();
/**
 * 网关提供的模型选项（来自发现缓存）。
 */
//@ chunk-aepeg2w5.js:401191-401476 placement
function getGatewayModelOptions() {
  if (!isGatewayModelDiscoveryEnabled()) return [];
  let e = readGatewayModelsCache(getGatewayModelsCachePath());
  if (!e || e.baseUrl !== env.ANTHROPIC_BASE_URL) return [];
  let n = weakMap_3.get(e);
  if (n) return n;
  let mapped = e.models.map((model) => ({
    value: model.id,
    label: sanitizeTitle(model.display_name ?? "") || sanitizeTitle(model.id),
    description:
      truncateAtWord(markdownSafeText(model.description ?? ""), GATEWAY_MODEL_DESCRIPTION_MAX) ||
      "From gateway",
  }));
  return (weakMap_3.set(e, mapped), mapped);
}
//@ chunk-aepeg2w5.js:401476-401548 placement
function qto(e) {
  return typeof e.value === "string" && e.label === sanitizeTitle(e.value);
}
/**
 * 向网关发现可用模型并缓存（第一方/自定义 base URL 时跳过）。
 */
//@ chunk-aepeg2w5.js:401548-404666 placement
async function discoverGatewayModels(e) {
  if (!isGatewayModelDiscoveryEnabled()) {
    if (env.CLAUDE_CODE_ENABLE_GATEWAY_MODEL_DISCOVERY) {
      let r = getAPIProvider();
      logForDebugging(
        `[gatewayDiscovery] skipped: ${r !== "firstParty" ? `provider is ${r}` : assumesFirstPartyBaseUrl() ? "the base URL is asserted to be the Anthropic API" : env.ANTHROPIC_BASE_URL ? "ANTHROPIC_BASE_URL is a first-party host" : "ANTHROPIC_BASE_URL is unset"}`,
      );
    }
    return;
  }
  let n = env.CLAUDE_CODE_GATEWAY_MODEL_DISCOVERY_TIMEOUT_MS ?? GATEWAY_DISCOVERY_TIMEOUT_MS;
  try {
    let ANTHROPIC_BASE_URL = env.ANTHROPIC_BASE_URL;
    if (!ANTHROPIC_BASE_URL) return;
    let ANTHROPIC_AUTH_TOKEN = env.ANTHROPIC_AUTH_TOKEN,
      h = isApiKeyHelperSafeToInvoke(),
      y =
        ANTHROPIC_AUTH_TOKEN || !h
          ? void 0
          : (await getApiKeyFromApiKeyHelper(getIsNonInteractiveSession()))?.trim(),
      S = ANTHROPIC_AUTH_TOKEN || y,
      w = getAnthropicApiKeySafe()?.trim() || y;
    if (!S && !w) {
      logForDebugging(
        h
          ? "[gatewayDiscovery] skipped: no credential (ANTHROPIC_AUTH_TOKEN, apiKeyHelper, or API key)"
          : "[gatewayDiscovery] skipped: apiKeyHelper requires workspace trust",
      );
      return;
    }
    let fromEntries = Object.fromEntries(getCustomHeaders().filter(([, se]) => se)),
      x = {
        ...(S && { Authorization: `Bearer ${S}` }),
        ...(w && { "x-api-key": w }),
        "anthropic-version": "2023-06-01",
        "User-Agent": claudeCodeUserAgent(),
      };
    for (let [se, Se] of Object.entries(fromEntries)) {
      for (let ae of Object.keys(x)) if (ae.toLowerCase() === se.toLowerCase()) delete x[ae];
      x[se] = Se;
    }
    let keys = Object.keys(fromEntries),
      F = new Set(keys.map((se) => se.toLowerCase()));
    validateAuthHeaders({
      apiKey: F.has("x-api-key") ? null : w || null,
      getApiKeySource: () => {
        let { source: source } = getAnthropicApiKeyWithSourceSafe({ skipRetrievingKeyFromApiKeyHelper: !0 });
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
    let L = `${ANTHROPIC_BASE_URL.replace(/\/+$/, "")}/v1/models?limit=1000`,
      G = await fetch(L, {
        method: "GET",
        headers: x,
        redirect: "error",
        signal: AbortSignal.timeout(n),
        ...getProxyFetchOptions({ url: L }),
        ...getTLSFetchOptions(withoutSensitiveHeaders(L, x)),
      });
    if (!G.ok) {
      logForDebugging(`[gatewayDiscovery] non-OK status ${G.status}`);
      return;
    }
    let body = await G.json(),
      safeParse = u({ data: A(gatewayModelSchema()) }).safeParse(body);
    if (!safeParse.success) {
      logForDebugging("[gatewayDiscovery] response body failed validation");
      return;
    }
    let filtered = safeParse.data.data.filter((se) => /(claude|anthropic)/i.test(se.id));
    if (filtered.length === 0) {
      logForDebugging("[gatewayDiscovery] 0 usable models after filter");
      return;
    }
    let Q = getGatewayModelsCachePath();
    if (isStorageV5Enabled() && e !== void 0) {
      let read = await e.read([Mp()]),
        Se =
          read.ok && read.value.items[0]?.found
            ? Mu(Buffer.from(read.value.items[0].value).toString("utf-8"))
            : null;
      if (!read.ok) logForDebugging(`[gatewayDiscovery] cache read failed: ${read.error.code}`);
      else Ui().set(Q, Se);
      if (Se && Se.baseUrl === ANTHROPIC_BASE_URL && En(Se.models, filtered)) return;
      let ae = jsonStringify({ baseUrl: ANTHROPIC_BASE_URL, fetchedAt: Date.now(), models: filtered });
      try {
        await mkdir(getCacheDir(), { recursive: !0 });
      } catch (error) {
        logForDebugging(
          `[gatewayDiscovery] cache folder could not be made: ${error instanceof Error ? error.message : "unknown"}`,
        );
        return;
      }
      let write = await e.write(Mp(), ae, { publishDiscipline: "inPlace", mode: 384 });
      if (!write.ok) {
        logForDebugging(`[gatewayDiscovery] cache write failed: ${write.error.code}`);
        return;
      }
      (Ui().set(Q, Mu(ae)), logForDebugging(`[gatewayDiscovery] cached ${filtered.length} models`));
      return;
    }
    let re = readGatewayModelsCache(Q);
    if (re && re.baseUrl === ANTHROPIC_BASE_URL && En(re.models, filtered)) return;
    (await mkdir(getCacheDir(), { recursive: !0 }),
      await writeFile(
        Q,
        jsonStringify({ baseUrl: ANTHROPIC_BASE_URL, fetchedAt: Date.now(), models: filtered }),
        { encoding: "utf-8", mode: 384 },
      ),
      Ui().delete(Q),
      logForDebugging(`[gatewayDiscovery] cached ${filtered.length} models`));
  } catch (error) {
    logForDebugging(
      error instanceof InvalidRequestHeaderValueError
        ? `[gatewayDiscovery] skipped: ${error.message}`
        : `[gatewayDiscovery] failed: ${error instanceof Error ? (error.name === "TimeoutError" ? `timed out after ${n}ms` : Tp(error.message)) : "unknown"}`,
    );
  }
}

export { primeGatewayModels, discoverGatewayModels, getGatewayModelOptions, qto };
