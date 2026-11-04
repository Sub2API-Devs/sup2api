/**
 * utils/model/providers.ts
 *
 * API 提供商判定：firstParty/bedrock/vertex/foundry/anthropicAws/anthropicGoogleCloud/mantle/gateway，以及第一方 base URL 白名单。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/model/providers.ts
 * pieces: chunk-1wpnxx5r.js (2), chunk-aepeg2w5.js (32), chunk-v9tcvh08.js (34)
 * attribution: placement 67, fingerprint 1
 */
import {
  getGatewayAuth,
  isGatewayServerProcess,
  isGatewayRequiredByHostPolicy,
  isDiskless,
} from "../../bootstrap/state.js";
import { env } from "../env.js";
import { fromEnum } from "../../services/analytics/safeMetadata.js";
import {
  hasVersionTrailer,
  strip1mSuffix,
  PROVIDER_ENV_FLAGS,
  MODEL_KEY_NAMES,
  LEGACY_MODEL_IDS,
} from "./modelIds.js";
import { findModelConfigById, getProviderState } from "./providerCaches.js";
import { PROVIDER_ENV_VARS, _CLAUDE_CODE_ASSUME_FIRST_PARTY_BASE_URL } from "../env/envRegistry.js";
import { ALLOWED_OAUTH_BASE_URLS } from "../../constants/oauth.js";
import { normalizeModelId } from "./modelCatalog/catalogEntries.js";
import { EFFORT_LEVELS } from "../effort.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-v9tcvh08.js:30612-31095 placement
var THIRD_PARTY_PROVIDER_LABELS = {
  bedrock: "Amazon Bedrock",
  vertex: "Google Vertex AI",
  foundry: "Microsoft Foundry",
  anthropicAws: "Claude Platform on AWS",
  anthropicGoogleCloud: "Claude Platform on Google Cloud",
  mantle: "Amazon Bedrock (Mantle)",
  gateway: "Cloud gateway",
};
var THIRD_PARTY_PROVIDER_ENV_VARS = {
  bedrock: "CLAUDE_CODE_USE_BEDROCK",
  foundry: "CLAUDE_CODE_USE_FOUNDRY",
  anthropicAws: "CLAUDE_CODE_USE_ANTHROPIC_AWS",
  anthropicGoogleCloud: "CLAUDE_CODE_USE_ANTHROPIC_GOOGLE_CLOUD",
  mantle: "CLAUDE_CODE_USE_MANTLE",
  vertex: "CLAUDE_CODE_USE_VERTEX",
};
//@ chunk-v9tcvh08.js:31095-31399 placement
function allowedProviderNameOf(provider) {
  switch (provider) {
    case "firstParty":
      return "anthropic";
    case "bedrock":
      return "bedrock";
    case "vertex":
      return "vertex";
    case "foundry":
      return "foundry";
    case "anthropicAws":
      return "anthropicAws";
    case "anthropicGoogleCloud":
      return "anthropicGoogleCloud";
    case "mantle":
      return "mantle";
    case "gateway":
      return "gateway";
  }
}
//@ chunk-v9tcvh08.js:31399-31428 placement
function isThirdPartyProviderLabel(label) {
  return label in THIRD_PARTY_PROVIDER_LABELS;
}
//@ chunk-v9tcvh08.js:31428-31591 placement
function allowedProviderLabel(label) {
  switch (label) {
    case "anthropic":
      return "Anthropic API";
    case "customEndpoint":
      return "a custom endpoint (LLM gateway or proxy)";
    default:
      return isThirdPartyProviderLabel(label) ? THIRD_PARTY_PROVIDER_LABELS[label] : label;
  }
}
//@ chunk-v9tcvh08.js:31591-31914 placement (2.1.88 match: getAPIProvider, 0.652)
/**
 * 当前提供商：网关模式为 gateway；否则按 CLAUDE_CODE_USE_BEDROCK/FOUNDRY/ANTHROPIC_AWS/ANTHROPIC_GOOGLE_CLOUD/MANTLE/VERTEX 顺序，都没有为 firstParty。
 */
function getAPIProvider() {
  if (getGatewayAuth() || isGatewayServerProcess() || isGatewayRequiredByHostPolicy()) return "gateway";
  return env.CLAUDE_CODE_USE_BEDROCK
    ? "bedrock"
    : env.CLAUDE_CODE_USE_FOUNDRY
      ? "foundry"
      : env.CLAUDE_CODE_USE_ANTHROPIC_AWS
        ? "anthropicAws"
        : env.CLAUDE_CODE_USE_ANTHROPIC_GOOGLE_CLOUD
          ? "anthropicGoogleCloud"
          : env.CLAUDE_CODE_USE_MANTLE
            ? "mantle"
            : env.CLAUDE_CODE_USE_VERTEX
              ? "vertex"
              : "firstParty";
}
//@ chunk-v9tcvh08.js:31914-31956 placement (2.1.88 match: logEventTo1P, 1)
function modelIdsAreOpaque() {
  return getAPIProvider() !== "firstParty";
}
//@ chunk-v9tcvh08.js:31956-31985 placement
function getAPIProviderForAnalytics() {
  return fromEnum(getAPIProvider());
}
//@ chunk-v9tcvh08.js:31985-32026 placement (2.1.88 match: logEventTo1P, 1)
function isFirstPartyProvider() {
  return getAPIProvider() === "firstParty";
}
//@ chunk-v9tcvh08.js:32026-32114 placement
function getSecondaryProvider() {
  if (getAPIProvider() === "bedrock" && env.CLAUDE_CODE_USE_MANTLE) return "mantle";
  return null;
}
//@ chunk-v9tcvh08.js:32114-32175 placement (2.1.88 match: isFoundationModel, 1)
/**
 * anthropic. 开头且不以 -v<n>[:<n>] 结尾。旧版名 isFoundationModel_3 不准确。
 */
function isBedrockFoundationModelWithoutVersion(modelId) {
  return modelId.startsWith("anthropic.") && !hasVersionTrailer(strip1mSuffix(modelId));
}
//@ chunk-v9tcvh08.js:32175-32317 placement
function getProviderForModel(modelId) {
  if (modelId) {
    let secondaryProvider = getSecondaryProvider();
    if (secondaryProvider) {
      if (secondaryProvider === "mantle" && isBedrockFoundationModelWithoutVersion(modelId))
        return secondaryProvider;
      let apiProvider = getAPIProvider();
      let modelConfigById = findModelConfigById(modelId);
      if (
        modelConfigById &&
        modelConfigById[apiProvider] === null &&
        modelConfigById[secondaryProvider] !== null
      )
        return secondaryProvider;
    }
  }
  return getAPIProvider();
}
//@ chunk-v9tcvh08.js:32317-32383 placement (2.1.88 match: getOpus46PricingSuffix, 0.646)
/**
 * 是否“第一方类”提供商：firstParty、anthropicAws、anthropicGoogleCloud 或 gateway（很多默认与 1M/effort 判断用它）。
 */
function usesFirstPartyModelIds(fastMode = getAPIProvider()) {
  return fastMode === "firstParty" || isClaudePlatformProvider(fastMode) || fastMode === "gateway";
}
//@ chunk-v9tcvh08.js:32383-32457 placement
function isClaudePlatformProvider(apiProvider = getAPIProvider()) {
  return apiProvider === "anthropicAws" || apiProvider === "anthropicGoogleCloud";
}
//@ chunk-v9tcvh08.js:32457-32484 placement
function usesFirstPartyPricing() {
  return isFirstPartyProvider();
}
//@ chunk-v9tcvh08.js:32484-32564 placement
function hasFirstPartyCapabilities(providerForModel = getAPIProvider()) {
  return (
    providerForModel === "firstParty" ||
    isClaudePlatformProvider(providerForModel) ||
    providerForModel === "foundry" ||
    providerForModel === "mantle"
  );
}
//@ chunk-v9tcvh08.js:32564-32611 placement (2.1.88 match: logEventTo1P, 1)
function isFirstPartyApiBackend() {
  return getAPIProvider() === "firstParty" && isFirstPartyAnthropicBaseUrl();
}
//@ chunk-v9tcvh08.js:32611-32716 placement
function providerReadsClientData() {
  let apiProvider = getAPIProvider();
  return (
    apiProvider === "firstParty" ||
    (apiProvider === "anthropicAws" && env.ANTHROPIC_AWS_BASE_URL === undefined)
  );
}
//@ chunk-v9tcvh08.js:32716-32759 placement
function isFirstPartyAnthropicBaseUrl() {
  if (assumesFirstPartyBaseUrl()) return true;
  return isActualFirstPartyAnthropicBaseUrl();
}
//@ chunk-v9tcvh08.js:32759-32868 placement
function assumesFirstPartyBaseUrl() {
  return (
    env._CLAUDE_CODE_ASSUME_FIRST_PARTY_BASE_URL ?? getProviderState().clientDataUrl.assumesFirstPartyBaseUrl
  );
}
//@ chunk-v9tcvh08.js:32868-32947 placement
function isActualFirstPartyAnthropicBaseUrl() {
  let envAnthropicBaseUrl = process.env.ANTHROPIC_BASE_URL;
  if (!envAnthropicBaseUrl) return true;
  return isFirstPartyAnthropicHost(envAnthropicBaseUrl);
}
//@ chunk-v9tcvh08.js:32947-33052 placement
var PROVIDER_ROUTING_ENV_VARS; // deferred: uses PROVIDER_ENV_FLAGS (./modelIds.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-v9tcvh08.js:32947", () => {
  PROVIDER_ROUTING_ENV_VARS = [
    ...PROVIDER_ENV_FLAGS,
    "CLAUDE_CODE_USE_GATEWAY",
    "ANTHROPIC_BASE_URL",
    "_CLAUDE_CODE_ASSUME_FIRST_PARTY_BASE_URL",
  ];
});
//@ chunk-v9tcvh08.js:33052-33282 placement
function routesOffAnthropicApiWith(readEnv) {
  if (PROVIDER_ENV_FLAGS.some((flag) => PROVIDER_ENV_VARS[flag].parse(readEnv(flag)) === true)) return true;
  let baseUrl = readEnv("ANTHROPIC_BASE_URL");
  if (!baseUrl) return false;
  return (
    !(
      _CLAUDE_CODE_ASSUME_FIRST_PARTY_BASE_URL.parse(readEnv("_CLAUDE_CODE_ASSUME_FIRST_PARTY_BASE_URL")) ??
      getProviderState().clientDataUrl.assumesFirstPartyBaseUrl
    ) && !isFirstPartyAnthropicHost(baseUrl)
  );
}
//@ chunk-v9tcvh08.js:33282-33321 placement
function hasCustomBaseUrlForAnalytics() {
  return isDiskless() ? undefined : !isActualFirstPartyAnthropicBaseUrl();
}
//@ chunk-v9tcvh08.js:33321-33492 placement
function configuredApiProxyHost() {
  let ANTHROPIC_BASE_URL = env.ANTHROPIC_BASE_URL;
  if (
    isDiskless() ||
    getAPIProvider() !== "firstParty" ||
    !ANTHROPIC_BASE_URL ||
    env.ANTHROPIC_UNIX_SOCKET !== undefined ||
    isFirstPartyAnthropicHost(ANTHROPIC_BASE_URL)
  )
    return;
  try {
    return new URL(ANTHROPIC_BASE_URL).host || undefined;
  } catch {
    return;
  }
}
//@ chunk-v9tcvh08.js:33492-33589 placement (2.1.88 match: getApiBaseUrlHost, 0.812)
function isFirstPartyAnthropicHost(url) {
  try {
    let host = new URL(url).host;
    return ["api.anthropic.com"].includes(host);
  } catch {
    return false;
  }
}
//@ chunk-v9tcvh08.js:33589-33867 placement
var AWS_REGION_PATTERN; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var GCP_REGION_PATTERN;
var AWS_DOMAIN_PATTERN;
var AWS_VPCE_HOST_RE;
deferInit("chunk-v9tcvh08.js:33589", () => {
  AWS_REGION_PATTERN = "[a-z]{2,4}(?:-[a-z]{2,5})?-[a-z]+-\\d+";
  GCP_REGION_PATTERN = "[a-z]+(?:-[a-z]+\\d+)?";
  AWS_DOMAIN_PATTERN =
    "(?:amazonaws\\.(?:com(?:\\.cn)?|eu)|api\\.aws|c2s\\.ic\\.gov|sc2s\\.sgov\\.gov|cloud\\.adc-e\\.uk|csp\\.hci\\.ic\\.gov)";
  AWS_VPCE_HOST_RE = new RegExp(
    `\\.(?!us-gov-)${AWS_REGION_PATTERN}\\.(?:vpce\\.)?(?:amazonaws\\.com|api\\.aws)$`,
  );
});
//@ chunk-v9tcvh08.js:33867-33968 placement
function buildAwsHostRe(service) {
  return new RegExp(
    `^(?:vpce-[a-z0-9-]+\\.)?${service}(?:-fips)?\\.${AWS_REGION_PATTERN}\\.(?:vpce\\.)?${AWS_DOMAIN_PATTERN}$`,
  );
}
//@ chunk-v9tcvh08.js:33968-34959 placement
/**
 * 各第三方提供商的端点配置：可覆盖 base URL 的环境变量（foundry 资源名转 URL）与自有主机名正则（Bedrock/Mantle/AWS/Vertex/Google Cloud/Azure）。
 */
var PROVIDER_ENDPOINTS; // deferred: uses buildAwsHostRe of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-v9tcvh08.js:33968", () => {
  PROVIDER_ENDPOINTS = {
    firstParty: undefined,
    gateway: undefined,
    bedrock: {
      variables: [
        {
          name: "ANTHROPIC_BEDROCK_BASE_URL",
        },
        {
          name: "AWS_ENDPOINT_URL_BEDROCK_RUNTIME",
        },
        {
          name: "AWS_ENDPOINT_URL_BEDROCK",
        },
        {
          name: "AWS_ENDPOINT_URL",
        },
      ],
      ownHost: buildAwsHostRe("bedrock(?:-runtime)?"),
    },
    mantle: {
      variables: [
        {
          name: "ANTHROPIC_BEDROCK_MANTLE_BASE_URL",
        },
      ],
      ownHost: buildAwsHostRe("bedrock-mantle"),
    },
    anthropicAws: {
      variables: [
        {
          name: "ANTHROPIC_AWS_BASE_URL",
        },
      ],
      ownHost: buildAwsHostRe("aws-external-anthropic"),
    },
    vertex: {
      variables: [
        {
          name: "ANTHROPIC_VERTEX_BASE_URL",
        },
      ],
      ownHost: new RegExp(
        `^(?:aiplatform|${GCP_REGION_PATTERN}-aiplatform|aiplatform\\.${GCP_REGION_PATTERN}\\.rep|[a-z0-9-]+\\.p)\\.googleapis\\.com$`,
      ),
    },
    anthropicGoogleCloud: {
      variables: [
        {
          name: "ANTHROPIC_GOOGLE_CLOUD_BASE_URL",
        },
      ],
      ownHost: new RegExp(
        `^(?:claude|claude\\.${GCP_REGION_PATTERN}\\.rep|[a-z0-9-]+\\.p)\\.googleapis\\.com$`,
      ),
    },
    foundry: {
      variables: [
        {
          name: "ANTHROPIC_FOUNDRY_BASE_URL",
        },
        {
          name: "ANTHROPIC_FOUNDRY_RESOURCE",
          urlOf: (resource) => `https://${resource}.services.ai.azure.com`,
        },
      ],
      ownHost: /^[a-z0-9-]{2,64}\.(?:services\.ai|cognitiveservices|openai)\.azure\.(?:com|us|cn)$/,
    },
  };
});
//@ chunk-v9tcvh08.js:34959-35002 placement (2.1.88 match: getVariablesByScope, 1)
/**
 * 返回某个模型提供者对应的 base URL 环境变量列表（切分误归，应属 API 提供者配置）。
 */
function providerEndpointVariables(provider) {
  return PROVIDER_ENDPOINTS[provider]?.variables ?? [];
}
//@ chunk-v9tcvh08.js:35002-35181 placement
function providerEndpointOverrides(provider, envVarOrUndefined) {
  let overrides = [];
  for (let { name, urlOf } of providerEndpointVariables(provider)) {
    let raw = envVarOrUndefined(name);
    if (!raw) continue;
    let url = urlOf === undefined ? raw : urlOf(raw);
    let verdict = classifyProviderEndpoint(provider, url);
    if (verdict !== "own")
      overrides.push({
        variable: name,
        url,
        verdict,
      });
  }
  return overrides;
}
//@ chunk-v9tcvh08.js:35181-35397 placement
function classifyProviderEndpoint(provider, url) {
  let endpoint = PROVIDER_ENDPOINTS[provider];
  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    return "unparsable";
  }
  let replaced = parsed.hostname.toLowerCase().replace(/\.$/, "");
  if (endpoint === undefined || !endpoint.ownHost.test(replaced)) return "foreign";
  return parsed.protocol === "https:" ? "own" : "insecure";
}
//@ chunk-v9tcvh08.js:35397-35437 placement
function isProviderServiceUrl(provider, url) {
  return classifyProviderEndpoint(provider, url) === "own";
}
//@ chunk-v9tcvh08.js:35437-35595 placement
function isGenuineBedrockEndpoint() {
  let ANTHROPIC_BEDROCK_BASE_URL = env.ANTHROPIC_BEDROCK_BASE_URL;
  if (ANTHROPIC_BEDROCK_BASE_URL === undefined) return true;
  return (
    isProviderServiceUrl("bedrock", ANTHROPIC_BEDROCK_BASE_URL) &&
    AWS_VPCE_HOST_RE.test(new URL(ANTHROPIC_BEDROCK_BASE_URL).hostname.toLowerCase().replace(/\.$/, ""))
  );
}
//@ chunk-v9tcvh08.js:35595-35659 placement
function shouldPropagateTraceContext() {
  return isFirstPartyAnthropicBaseUrl() || env.CLAUDE_CODE_PROPAGATE_TRACEPARENT;
}
//@ chunk-1wpnxx5r.js:770-799 placement
/**
 * JSON.stringify 的别名。
 */
var jsonStringify = (value) => JSON.stringify(value);
//@ chunk-1wpnxx5r.js:799-920 fingerprint (2.1.88 match: isFirstPartyAnthropicBaseUrl, 0.642)
/**
 * api.anthropic.com、api-staging.anthropic.com；同句 ue 再加 OAuth 允许的 base URL 主机。
 */
var FIRST_PARTY_API_HOSTS; // deferred: uses ALLOWED_OAUTH_BASE_URLS (../../constants/oauth.js) of its import cycle while loading; runs once the cycle is complete
var ALLOWED_API_HOSTS;
deferInit("chunk-1wpnxx5r.js:799", () => {
  FIRST_PARTY_API_HOSTS = new Set(["api.anthropic.com", "api-staging.anthropic.com"]);
  ALLOWED_API_HOSTS = new Set([
    ...FIRST_PARTY_API_HOSTS,
    ...ALLOWED_OAUTH_BASE_URLS.map((url) => new URL(url).hostname),
  ]);
});
//@ chunk-aepeg2w5.js:135864-136057 placement
/**
 * 模型所属族（best/opusplan 归为 other）。
 */
function modelFamilyOf(model, canonicalName) {
  let lower = strip1mSuffix(model).toLowerCase();
  let found = MODEL_KEY_NAMES.find((name) => name === lower);
  if (found) return found;
  if (lower === "best" || lower === "opusplan") return "other";
  let lower_2 = strip1mSuffix(canonicalName).toLowerCase();
  return MODEL_KEY_NAMES.find((name) => lower_2.includes(name)) ?? "other";
}
//@ chunk-aepeg2w5.js:136057-136091 placement
/**
 * 目录中支持的模型族名（opus/sonnet/haiku）。
 */
var MODEL_FAMILY_NAMES = ["opus", "sonnet", "haiku"];
//@ chunk-aepeg2w5.js:136091-136129 placement
/**
 * 判断字符串是否为模型族名。
 */
function isModelFamily(family) {
  return MODEL_FAMILY_NAMES.includes(family);
}
//@ chunk-aepeg2w5.js:136129-136438 placement
/**
 * 提供商在目录中的键名。
 */
function providerCatalogKey(apiProvider) {
  switch (apiProvider) {
    case "firstParty":
      return "first_party";
    case "bedrock":
      return "bedrock";
    case "vertex":
      return "vertex";
    case "foundry":
      return "foundry";
    case "anthropicAws":
      return "anthropic_aws";
    case "anthropicGoogleCloud":
      return "anthropic_google_cloud";
    case "mantle":
      return "mantle";
    case "gateway":
      return "gateway";
  }
}
//@ chunk-aepeg2w5.js:136438-136504 placement
/**
 * 判断目录行是否在给定提供商下提供（offered_on 为空视为全部）。
 */
function isProviderOffered(row, providerKey) {
  let offeredOn = row.offered_on;
  return offeredOn == null || offeredOn.includes(providerKey);
}
//@ chunk-aepeg2w5.js:136504-136578 placement
var CLOUD_PROVIDER_KEYS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var weakMap;
deferInit("chunk-aepeg2w5.js:136504", () => {
  CLOUD_PROVIDER_KEYS = new Set(["anthropic_aws", "anthropic_google_cloud"]);
  weakMap = new WeakMap();
});
//@ chunk-aepeg2w5.js:136578-136722 placement
function isProviderOffered_2(catalog, providerKey) {
  let offeredOn = weakMap.get(catalog);
  if (offeredOn === undefined) {
    offeredOn = new Set();
    for (let row of catalogModels(catalog))
      for (let provider of row.offered_on ?? []) offeredOn.add(provider);
    weakMap.set(catalog, offeredOn);
  }
  return offeredOn.has(providerKey);
}
//@ chunk-aepeg2w5.js:136722-136795 placement
/**
 * 计算目录行实际使用的提供商键（云后端未提供时回退 first_party）。
 */
function effectiveCatalogProviderKey(catalog, apiProvider) {
  let key = providerCatalogKey(apiProvider);
  return CLOUD_PROVIDER_KEYS.has(key) && !isProviderOffered_2(catalog, key) ? "first_party" : key;
}
//@ chunk-aepeg2w5.js:136795-137078 placement
/**
 * 读取目录中某别名在指定提供商下的目标与通用目标。
 */
function getProviderAliasTargets(catalog, alias, providerKey) {
  let providerAliasTargets = catalog.config.provider_alias_targets;
  let targets =
    providerAliasTargets != null && Object.hasOwn(providerAliasTargets, alias)
      ? providerAliasTargets[alias]
      : undefined;
  if (targets == null) return {};
  let perProvider =
    targets.per_provider != null && Object.hasOwn(targets.per_provider, providerKey)
      ? targets.per_provider[providerKey]?.trim()
      : undefined;
  let trimmed = targets.default?.trim();
  return {
    ...(perProvider && {
      perProvider,
    }),
    ...(trimmed && {
      everywhere: trimmed,
    }),
  };
}
//@ chunk-aepeg2w5.js:137078-137279 placement
/**
 * 判断目录是否为某别名声明了任何提供商目标。
 */
function hasProviderAliasTarget(catalog, alias) {
  let providerAliasTargets = catalog.config.provider_alias_targets;
  let targets =
    providerAliasTargets != null && Object.hasOwn(providerAliasTargets, alias)
      ? providerAliasTargets[alias]
      : undefined;
  if (targets == null) return false;
  return (
    !!targets.default?.trim() || Object.values(targets.per_provider ?? {}).some((target) => !!target?.trim())
  );
}
//@ chunk-aepeg2w5.js:137279-137321 placement
/**
 * 目录中的模型列表。
 */
function catalogModels(catalog) {
  return catalog.config.models ?? [];
}
//@ chunk-aepeg2w5.js:137321-137361 placement
/**
 * 未禁用、未弃用的目录模型。
 */
function activeCatalogModels_2(catalog) {
  return catalogModels(catalog).filter(isActiveCatalogModel);
}
//@ chunk-aepeg2w5.js:137361-137425 placement
/**
 * 目录模型是否可用。
 */
function isActiveCatalogModel(row) {
  return row.disabled !== true && row.section !== "deprecated";
}
//@ chunk-aepeg2w5.js:137425-137471 placement
/**
 * 判断目录行是否属于 overflow 分区。
 */
function isOverflowRow(row) {
  return row.section === "overflow";
}
//@ chunk-aepeg2w5.js:137471-137516 placement
/**
 * 列出目录中的模型 id。
 */
function activeCatalogModelIds(catalog) {
  return activeCatalogModels_2(catalog).map((row) => row.id);
}
//@ chunk-aepeg2w5.js:137516-137554 placement
/**
 * 取目录状态里配置的默认模型。
 */
function catalogStateModel(catalog) {
  return catalog.state?.model;
}
//@ chunk-aepeg2w5.js:137554-137678 placement
/**
 * 返回目录行的模型族（runtime.family 或按 id 推断）。
 */
function getRowFamily(row) {
  let lower = row.runtime?.family?.trim().toLowerCase();
  if (lower) return lower;
  let family = modelFamilyOf(row.id, row.id);
  return family === "other" ? undefined : family;
}
//@ chunk-aepeg2w5.js:137678-137711 placement
/**
 * 计算目录中各族的首个模型 id 映射。
 */
function familyDefaultMap(catalog) {
  return familyFirstIds(activeCatalogModels_2(catalog));
}
//@ chunk-aepeg2w5.js:137711-137807 placement
/**
 * 从目录行中挑出各模型族的首个 id。
 */
function familyFirstIds(rows) {
  let firstByFamily = {};
  for (let row of rows) {
    let family = getRowFamily(row);
    if (isModelFamily(family) && firstByFamily[family] === undefined) firstByFamily[family] = row.id;
  }
  return firstByFamily;
}
//@ chunk-aepeg2w5.js:137807-137838 placement
var PROVIDER_MODEL_SHORTHAND_RE = /^[a-z][a-z0-9]{1,23}$/;
//@ chunk-aepeg2w5.js:137838-137929 placement
var KNOWN_MODEL_KEYS; // deferred: uses LEGACY_MODEL_IDS_2 (./modelIds.js) of its import cycle while loading; runs once the cycle is complete
var RESERVED_MODEL_KEYS;
deferInit("chunk-aepeg2w5.js:137838", () => {
  KNOWN_MODEL_KEYS = new Set(LEGACY_MODEL_IDS.map((id) => strip1mSuffix(id)));
  RESERVED_MODEL_KEYS = new Set([...KNOWN_MODEL_KEYS, "default", "inherit", "latest", "fast"]);
});
//@ chunk-aepeg2w5.js:137929-138073 placement
function getRuntimeFamilyDefault(row, kind) {
  let lower = (kind === "default" ? row.runtime?.default_for_family : row.runtime?.fast_default_for_family)
    ?.trim()
    .toLowerCase();
  return lower ? lower : undefined;
}
//@ chunk-aepeg2w5.js:138073-138141 placement
function usableShorthandModel(runtimeFamilyDefault) {
  return (
    PROVIDER_MODEL_SHORTHAND_RE.test(runtimeFamilyDefault) &&
    !RESERVED_MODEL_KEYS.has(runtimeFamilyDefault) &&
    !runtimeFamilyDefault.includes("claude")
  );
}
//@ chunk-aepeg2w5.js:138141-138206 placement
/**
 * 取目录中某族的运行时默认模型（需是合法简写）。
 */
function runtimeFamilyDefaultShorthand(row, kind) {
  let runtimeFamilyDefault = getRuntimeFamilyDefault(row, kind);
  return runtimeFamilyDefault !== undefined && usableShorthandModel(runtimeFamilyDefault)
    ? runtimeFamilyDefault
    : undefined;
}
//@ chunk-aepeg2w5.js:138206-138272 placement
/**
 * 在给定目录中按 id 查模型行。
 */
function findServedCatalogRow(catalog, modelId) {
  let normalized = normalizeModelId(modelId);
  return catalogModels(catalog).find((row) => normalizeModelId(row.id) === normalized);
}
//@ chunk-aepeg2w5.js:138272-138359 placement
/**
 * 取目录行的最大输入 token（缺省用 context_window）。
 */
function servedMaxInputTokensOf(catalog, mainLoopModel) {
  let servedCatalogRow = findServedCatalogRow(catalog, mainLoopModel);
  return servedCatalogRow?.runtime?.max_input_tokens ?? servedCatalogRow?.context_window;
}
//@ chunk-aepeg2w5.js:138359-138420 placement
/**
 * 取目录行的最大输出 token。
 */
function servedMaxOutputTokensOf(catalog, modelId) {
  return findServedCatalogRow(catalog, modelId)?.runtime?.max_output_tokens;
}
//@ chunk-aepeg2w5.js:138420-138536 placement
/**
 * 读取目录中模型的默认输出 token 数。
 */
function getDefaultOutputTokens(catalog, modelId) {
  let defaultOutputTokens = findServedCatalogRow(catalog, modelId)?.runtime?.default_output_tokens;
  return defaultOutputTokens !== undefined && Number.isFinite(defaultOutputTokens) && defaultOutputTokens > 0
    ? defaultOutputTokens
    : undefined;
}
//@ chunk-aepeg2w5.js:138536-138642 placement
/**
 * 读取目录中模型的默认 effort 等级。
 */
function getDefaultEffort(catalog, modelId) {
  let lower = findServedCatalogRow(catalog, modelId)?.runtime?.default_effort?.trim().toLowerCase();
  return EFFORT_LEVELS.find((level) => level === lower);
}
//@ chunk-aepeg2w5.js:138642-138701 placement
/**
 * 判断目录中是否有任何行带 runtime 信息。
 */
function catalogHasRuntime(catalog) {
  return catalogModels(catalog).some((row) => row.runtime !== undefined);
}
//@ chunk-aepeg2w5.js:138701-138791 placement
/**
 * 取目录中保密模型的 id 集合。
 */
function confidentialModelIds(catalog) {
  return new Set(
    catalogModels(catalog)
      .filter((row) => row.confidential === true)
      .map((row) => normalizeModelId(row.id)),
  );
}
//@ chunk-aepeg2w5.js:138791-138880 placement
/**
 * 取目录中非保密（公开）模型的 id 集合。
 */
function publicModelIds(catalog) {
  return new Set(
    catalogModels(catalog)
      .filter((row) => row.confidential !== true)
      .map((row) => normalizeModelId(row.id)),
  );
}
export {
  getAPIProvider,
  allowedProviderLabel,
  getSecondaryProvider,
  THIRD_PARTY_PROVIDER_LABELS,
  usesFirstPartyModelIds,
  isFirstPartyAnthropicBaseUrl,
  isActiveCatalogModel,
  isFirstPartyApiBackend,
  getAPIProviderForAnalytics,
  modelFamilyOf,
  isFirstPartyProvider,
  isActualFirstPartyAnthropicBaseUrl,
  isFirstPartyAnthropicHost,
  configuredApiProxyHost,
  hasFirstPartyCapabilities,
  getProviderForModel,
  shouldPropagateTraceContext,
  usesFirstPartyPricing,
  FIRST_PARTY_API_HOSTS,
  assumesFirstPartyBaseUrl,
  isGenuineBedrockEndpoint,
  jsonStringify,
  ALLOWED_API_HOSTS,
  catalogModels,
  runtimeFamilyDefaultShorthand,
  activeCatalogModels_2,
  providerCatalogKey,
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
  hasCustomBaseUrlForAnalytics,
  modelIdsAreOpaque,
  THIRD_PARTY_PROVIDER_ENV_VARS,
  isClaudePlatformProvider,
  providerReadsClientData,
  publicModelIds,
  getRowFamily,
  familyDefaultMap,
  isModelFamily,
  effectiveCatalogProviderKey,
  isProviderOffered,
  familyFirstIds,
  getProviderAliasTargets,
  hasProviderAliasTarget,
  providerEndpointOverrides,
  allowedProviderNameOf,
  providerEndpointVariables,
  isProviderServiceUrl,
  routesOffAnthropicApiWith,
  isOverflowRow,
};
