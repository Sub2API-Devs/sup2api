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
import { hxi, Lt, PROVIDER_ENV_FLAGS, v8, E8 } from "./modelIds.js";
import { findModelConfigById, getProviderState } from "./providerCaches.js";
import { PROVIDER_ENV_VARS, _CLAUDE_CODE_ASSUME_FIRST_PARTY_BASE_URL } from "../env/envRegistry.js";
import { normalizeModelId } from "./modelCatalog/catalogEntries.js";
import { EFFORT_LEVELS } from "../effort.js";
import { ALLOWED_OAUTH_BASE_URLS } from "../../constants/oauth.js";

//@ chunk-v9tcvh08.js:30612-31095 placement
var THIRD_PARTY_PROVIDER_LABELS = {
    bedrock: "Amazon Bedrock",
    vertex: "Google Vertex AI",
    foundry: "Microsoft Foundry",
    anthropicAws: "Claude Platform on AWS",
    anthropicGoogleCloud: "Claude Platform on Google Cloud",
    mantle: "Amazon Bedrock (Mantle)",
    gateway: "Cloud gateway",
  },
  THIRD_PARTY_PROVIDER_ENV_VARS = {
    bedrock: "CLAUDE_CODE_USE_BEDROCK",
    foundry: "CLAUDE_CODE_USE_FOUNDRY",
    anthropicAws: "CLAUDE_CODE_USE_ANTHROPIC_AWS",
    anthropicGoogleCloud: "CLAUDE_CODE_USE_ANTHROPIC_GOOGLE_CLOUD",
    mantle: "CLAUDE_CODE_USE_MANTLE",
    vertex: "CLAUDE_CODE_USE_VERTEX",
  };
//@ chunk-v9tcvh08.js:31095-31399 placement
function allowedProviderNameOf(e) {
  switch (e) {
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
function j(e) {
  return e in THIRD_PARTY_PROVIDER_LABELS;
}
//@ chunk-v9tcvh08.js:31428-31591 placement
function allowedProviderLabel(e) {
  switch (e) {
    case "anthropic":
      return "Anthropic API";
    case "customEndpoint":
      return "a custom endpoint (LLM gateway or proxy)";
    default:
      return j(e) ? THIRD_PARTY_PROVIDER_LABELS[e] : e;
  }
}
/**
 * 当前提供商：网关模式为 gateway；否则按 CLAUDE_CODE_USE_BEDROCK/FOUNDRY/ANTHROPIC_AWS/ANTHROPIC_GOOGLE_CLOUD/MANTLE/VERTEX 顺序，都没有为 firstParty。
 */
//@ chunk-v9tcvh08.js:31591-31914 placement = getAPIProvider (0.652)
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
//@ chunk-v9tcvh08.js:31914-31956 placement = logEventTo1P (1)
function modelIdsAreOpaque() {
  return getAPIProvider() !== "firstParty";
}
//@ chunk-v9tcvh08.js:31956-31985 placement
function getAPIProviderForAnalytics() {
  return fromEnum(getAPIProvider());
}
//@ chunk-v9tcvh08.js:31985-32026 placement = logEventTo1P (1)
function isFirstPartyProvider() {
  return getAPIProvider() === "firstParty";
}
//@ chunk-v9tcvh08.js:32026-32114 placement
function getSecondaryProvider() {
  if (getAPIProvider() === "bedrock" && env.CLAUDE_CODE_USE_MANTLE) return "mantle";
  return null;
}
/**
 * anthropic. 开头且不以 -v<n>[:<n>] 结尾。旧版名 isFoundationModel_3 不准确。
 */
//@ chunk-v9tcvh08.js:32114-32175 placement = isFoundationModel (1)
function isBedrockFoundationModelWithoutVersion(modelId) {
  return modelId.startsWith("anthropic.") && !hxi(Lt(modelId));
}
//@ chunk-v9tcvh08.js:32175-32317 placement
function getProviderForModel(e) {
  if (e) {
    let t = getSecondaryProvider();
    if (t) {
      if (t === "mantle" && isBedrockFoundationModelWithoutVersion(e)) return t;
      let a = getAPIProvider(),
        n = findModelConfigById(e);
      if (n && n[a] === null && n[t] !== null) return t;
    }
  }
  return getAPIProvider();
}
/**
 * 是否“第一方类”提供商：firstParty、anthropicAws、anthropicGoogleCloud 或 gateway（很多默认与 1M/effort 判断用它）。
 */
//@ chunk-v9tcvh08.js:32317-32383 placement = getOpus46PricingSuffix (0.646)
function usesFirstPartyModelIds(fastMode = getAPIProvider()) {
  return fastMode === "firstParty" || isClaudePlatformProvider(fastMode) || fastMode === "gateway";
}
//@ chunk-v9tcvh08.js:32383-32457 placement
function isClaudePlatformProvider(e = getAPIProvider()) {
  return e === "anthropicAws" || e === "anthropicGoogleCloud";
}
//@ chunk-v9tcvh08.js:32457-32484 placement
function usesFirstPartyPricing() {
  return isFirstPartyProvider();
}
//@ chunk-v9tcvh08.js:32484-32564 placement
function hasFirstPartyCapabilities(e = getAPIProvider()) {
  return e === "firstParty" || isClaudePlatformProvider(e) || e === "foundry" || e === "mantle";
}
//@ chunk-v9tcvh08.js:32564-32611 placement = logEventTo1P (1)
function isFirstPartyApiBackend() {
  return getAPIProvider() === "firstParty" && isFirstPartyAnthropicBaseUrl();
}
//@ chunk-v9tcvh08.js:32611-32716 placement
function providerReadsClientData() {
  let e = getAPIProvider();
  return e === "firstParty" || (e === "anthropicAws" && env.ANTHROPIC_AWS_BASE_URL === void 0);
}
//@ chunk-v9tcvh08.js:32716-32759 placement
function isFirstPartyAnthropicBaseUrl() {
  if (assumesFirstPartyBaseUrl()) return !0;
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
  if (!envAnthropicBaseUrl) return !0;
  return isFirstPartyAnthropicHost(envAnthropicBaseUrl);
}
//@ chunk-v9tcvh08.js:32947-33052 placement
var PROVIDER_ROUTING_ENV_VARS = [
  ...PROVIDER_ENV_FLAGS,
  "CLAUDE_CODE_USE_GATEWAY",
  "ANTHROPIC_BASE_URL",
  "_CLAUDE_CODE_ASSUME_FIRST_PARTY_BASE_URL",
];
//@ chunk-v9tcvh08.js:33052-33282 placement
function routesOffAnthropicApiWith(e) {
  if (PROVIDER_ENV_FLAGS.some((n) => PROVIDER_ENV_VARS[n].parse(e(n)) === !0)) return !0;
  let t = e("ANTHROPIC_BASE_URL");
  if (!t) return !1;
  return (
    !(
      _CLAUDE_CODE_ASSUME_FIRST_PARTY_BASE_URL.parse(e("_CLAUDE_CODE_ASSUME_FIRST_PARTY_BASE_URL")) ??
      getProviderState().clientDataUrl.assumesFirstPartyBaseUrl
    ) && !isFirstPartyAnthropicHost(t)
  );
}
//@ chunk-v9tcvh08.js:33282-33321 placement
function hasCustomBaseUrlForAnalytics() {
  return isDiskless() ? void 0 : !isActualFirstPartyAnthropicBaseUrl();
}
//@ chunk-v9tcvh08.js:33321-33492 placement
function configuredApiProxyHost() {
  let ANTHROPIC_BASE_URL = env.ANTHROPIC_BASE_URL;
  if (
    isDiskless() ||
    getAPIProvider() !== "firstParty" ||
    !ANTHROPIC_BASE_URL ||
    env.ANTHROPIC_UNIX_SOCKET !== void 0 ||
    isFirstPartyAnthropicHost(ANTHROPIC_BASE_URL)
  )
    return;
  try {
    return new URL(ANTHROPIC_BASE_URL).host || void 0;
  } catch {
    return;
  }
}
//@ chunk-v9tcvh08.js:33492-33589 placement = getApiBaseUrlHost (0.812)
function isFirstPartyAnthropicHost(e) {
  try {
    let host = new URL(e).host;
    return ["api.anthropic.com"].includes(host);
  } catch {
    return !1;
  }
}
//@ chunk-v9tcvh08.js:33589-33867 placement
var AWS_REGION_PATTERN = "[a-z]{2,4}(?:-[a-z]{2,5})?-[a-z]+-\\d+",
  GCP_REGION_PATTERN = "[a-z]+(?:-[a-z]+\\d+)?",
  AWS_DOMAIN_PATTERN =
    "(?:amazonaws\\.(?:com(?:\\.cn)?|eu)|api\\.aws|c2s\\.ic\\.gov|sc2s\\.sgov\\.gov|cloud\\.adc-e\\.uk|csp\\.hci\\.ic\\.gov)",
  AWS_VPCE_HOST_RE = new RegExp(
    `\\.(?!us-gov-)${AWS_REGION_PATTERN}\\.(?:vpce\\.)?(?:amazonaws\\.com|api\\.aws)$`,
  );
//@ chunk-v9tcvh08.js:33867-33968 placement
function buildAwsHostRe(e) {
  return new RegExp(
    `^(?:vpce-[a-z0-9-]+\\.)?${e}(?:-fips)?\\.${AWS_REGION_PATTERN}\\.(?:vpce\\.)?${AWS_DOMAIN_PATTERN}$`,
  );
}
/**
 * 各第三方提供商的端点配置：可覆盖 base URL 的环境变量（foundry 资源名转 URL）与自有主机名正则（Bedrock/Mantle/AWS/Vertex/Google Cloud/Azure）。
 */
//@ chunk-v9tcvh08.js:33968-34959 placement
var PROVIDER_ENDPOINTS = {
  firstParty: void 0,
  gateway: void 0,
  bedrock: {
    variables: [
      { name: "ANTHROPIC_BEDROCK_BASE_URL" },
      { name: "AWS_ENDPOINT_URL_BEDROCK_RUNTIME" },
      { name: "AWS_ENDPOINT_URL_BEDROCK" },
      { name: "AWS_ENDPOINT_URL" },
    ],
    ownHost: buildAwsHostRe("bedrock(?:-runtime)?"),
  },
  mantle: {
    variables: [{ name: "ANTHROPIC_BEDROCK_MANTLE_BASE_URL" }],
    ownHost: buildAwsHostRe("bedrock-mantle"),
  },
  anthropicAws: {
    variables: [{ name: "ANTHROPIC_AWS_BASE_URL" }],
    ownHost: buildAwsHostRe("aws-external-anthropic"),
  },
  vertex: {
    variables: [{ name: "ANTHROPIC_VERTEX_BASE_URL" }],
    ownHost: new RegExp(
      `^(?:aiplatform|${GCP_REGION_PATTERN}-aiplatform|aiplatform\\.${GCP_REGION_PATTERN}\\.rep|[a-z0-9-]+\\.p)\\.googleapis\\.com$`,
    ),
  },
  anthropicGoogleCloud: {
    variables: [{ name: "ANTHROPIC_GOOGLE_CLOUD_BASE_URL" }],
    ownHost: new RegExp(
      `^(?:claude|claude\\.${GCP_REGION_PATTERN}\\.rep|[a-z0-9-]+\\.p)\\.googleapis\\.com$`,
    ),
  },
  foundry: {
    variables: [
      { name: "ANTHROPIC_FOUNDRY_BASE_URL" },
      {
        name: "ANTHROPIC_FOUNDRY_RESOURCE",
        urlOf: (resource) => `https://${resource}.services.ai.azure.com`,
      },
    ],
    ownHost: /^[a-z0-9-]{2,64}\.(?:services\.ai|cognitiveservices|openai)\.azure\.(?:com|us|cn)$/,
  },
};
/**
 * 返回某个模型提供者对应的 base URL 环境变量列表（切分误归，应属 API 提供者配置）。
 */
//@ chunk-v9tcvh08.js:34959-35002 placement = getVariablesByScope (1)
function providerEndpointVariables(e) {
  return PROVIDER_ENDPOINTS[e]?.variables ?? [];
}
//@ chunk-v9tcvh08.js:35002-35181 placement
function providerEndpointOverrides(e, t) {
  let a = [];
  for (let { name: n, urlOf: urlOf } of providerEndpointVariables(e)) {
    let d = t(n);
    if (!d) continue;
    let l = urlOf === void 0 ? d : urlOf(d),
      _ = classifyProviderEndpoint(e, l);
    if (_ !== "own") a.push({ variable: n, url: l, verdict: _ });
  }
  return a;
}
//@ chunk-v9tcvh08.js:35181-35397 placement
function classifyProviderEndpoint(e, t) {
  let a = PROVIDER_ENDPOINTS[e],
    n;
  try {
    n = new URL(t);
  } catch {
    return "unparsable";
  }
  let replaced = n.hostname.toLowerCase().replace(/\.$/, "");
  if (a === void 0 || !a.ownHost.test(replaced)) return "foreign";
  return n.protocol === "https:" ? "own" : "insecure";
}
//@ chunk-v9tcvh08.js:35397-35437 placement
function isProviderServiceUrl(e, t) {
  return classifyProviderEndpoint(e, t) === "own";
}
//@ chunk-v9tcvh08.js:35437-35595 placement
function isGenuineBedrockEndpoint() {
  let ANTHROPIC_BEDROCK_BASE_URL = env.ANTHROPIC_BEDROCK_BASE_URL;
  if (ANTHROPIC_BEDROCK_BASE_URL === void 0) return !0;
  return (
    isProviderServiceUrl("bedrock", ANTHROPIC_BEDROCK_BASE_URL) &&
    AWS_VPCE_HOST_RE.test(new URL(ANTHROPIC_BEDROCK_BASE_URL).hostname.toLowerCase().replace(/\.$/, ""))
  );
}
//@ chunk-v9tcvh08.js:35595-35659 placement
function shouldPropagateTraceContext() {
  return isFirstPartyAnthropicBaseUrl() || env.CLAUDE_CODE_PROPAGATE_TRACEPARENT;
}
/**
 * 模型所属族（best/opusplan 归为 other）。
 */
//@ chunk-aepeg2w5.js:135864-136057 placement
function modelFamilyOf(e, n) {
  let lower = Lt(e).toLowerCase(),
    found = v8.find((y) => y === lower);
  if (found) return found;
  if (lower === "best" || lower === "opusplan") return "other";
  let lower_2 = Lt(n).toLowerCase();
  return v8.find((y) => lower_2.includes(y)) ?? "other";
}
//@ chunk-aepeg2w5.js:136057-136091 placement
var a6e = ["opus", "sonnet", "haiku"];
//@ chunk-aepeg2w5.js:136091-136129 placement
function hi(e) {
  return a6e.includes(e);
}
/**
 * 提供商在目录中的键名。
 */
//@ chunk-aepeg2w5.js:136129-136438 placement
function providerCatalogKey(e) {
  switch (e) {
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
function Iy(e, n) {
  let offered_on = e.offered_on;
  return offered_on == null || offered_on.includes(n);
}
//@ chunk-aepeg2w5.js:136504-136578 placement
var DD = new Set(["anthropic_aws", "anthropic_google_cloud"]),
  weakMap = new WeakMap();
//@ chunk-aepeg2w5.js:136578-136722 placement
function isProviderOffered(e, n) {
  let r = weakMap.get(e);
  if (r === void 0) {
    r = new Set();
    for (let s of catalogModels(e)) for (let h of s.offered_on ?? []) r.add(h);
    weakMap.set(e, r);
  }
  return r.has(n);
}
//@ chunk-aepeg2w5.js:136722-136795 placement
function Dy(e, n) {
  let r = providerCatalogKey(n);
  return DD.has(r) && !isProviderOffered(e, r) ? "first_party" : r;
}
/**
 * 读取目录中某别名在指定提供商下的目标与通用目标。
 */
//@ chunk-aepeg2w5.js:136795-137078 placement
function getProviderAliasTargets(e, n, r) {
  let provider_alias_targets = e.config.provider_alias_targets,
    h =
      provider_alias_targets != null && Object.hasOwn(provider_alias_targets, n)
        ? provider_alias_targets[n]
        : void 0;
  if (h == null) return {};
  let y = h.per_provider != null && Object.hasOwn(h.per_provider, r) ? h.per_provider[r]?.trim() : void 0,
    S = h.default?.trim();
  return { ...(y && { perProvider: y }), ...(S && { everywhere: S }) };
}
/**
 * 判断目录是否为某别名声明了任何提供商目标。
 */
//@ chunk-aepeg2w5.js:137078-137279 placement
function hasProviderAliasTarget(e, n) {
  let provider_alias_targets = e.config.provider_alias_targets,
    s =
      provider_alias_targets != null && Object.hasOwn(provider_alias_targets, n)
        ? provider_alias_targets[n]
        : void 0;
  if (s == null) return !1;
  return !!s.default?.trim() || Object.values(s.per_provider ?? {}).some((h) => !!h?.trim());
}
/**
 * 目录中的模型列表。
 */
//@ chunk-aepeg2w5.js:137279-137321 placement
function catalogModels(e) {
  return e.config.models ?? [];
}
/**
 * 未禁用、未弃用的目录模型。
 */
//@ chunk-aepeg2w5.js:137321-137361 placement
function activeCatalogModels(e) {
  return catalogModels(e).filter(isActiveCatalogModel);
}
/**
 * 目录模型是否可用。
 */
//@ chunk-aepeg2w5.js:137361-137425 placement
function isActiveCatalogModel(e) {
  return e.disabled !== !0 && e.section !== "deprecated";
}
//@ chunk-aepeg2w5.js:137425-137471 placement
function ato(e) {
  return e.section === "overflow";
}
//@ chunk-aepeg2w5.js:137471-137516 placement
function qSi(e) {
  return activeCatalogModels(e).map((n) => n.id);
}
//@ chunk-aepeg2w5.js:137516-137554 placement
function Dos(e) {
  return e.state?.model;
}
/**
 * 返回目录行的模型族（runtime.family 或按 id 推断）。
 */
//@ chunk-aepeg2w5.js:137554-137678 placement
function getRowFamily(e) {
  let n = e.runtime?.family?.trim().toLowerCase();
  if (n) return n;
  let r = modelFamilyOf(e.id, e.id);
  return r === "other" ? void 0 : r;
}
//@ chunk-aepeg2w5.js:137678-137711 placement
function Fy(e) {
  return Oc(activeCatalogModels(e));
}
//@ chunk-aepeg2w5.js:137711-137807 placement
function Oc(e) {
  let n = {};
  for (let r of e) {
    let s = getRowFamily(r);
    if (hi(s) && n[s] === void 0) n[s] = r.id;
  }
  return n;
}
//@ chunk-aepeg2w5.js:137807-137838 placement
var FD = /^[a-z][a-z0-9]{1,23}$/;
//@ chunk-aepeg2w5.js:137838-137929 placement
var LD = new Set(E8.map((e) => Lt(e))),
  UD = new Set([...LD, "default", "inherit", "latest", "fast"]);
//@ chunk-aepeg2w5.js:137929-138073 placement
function getRuntimeFamilyDefault(e, n) {
  let s = (n === "default" ? e.runtime?.default_for_family : e.runtime?.fast_default_for_family)
    ?.trim()
    .toLowerCase();
  return s ? s : void 0;
}
//@ chunk-aepeg2w5.js:138073-138141 placement
function HD(e) {
  return FD.test(e) && !UD.has(e) && !e.includes("claude");
}
//@ chunk-aepeg2w5.js:138141-138206 placement
function BD(e, n) {
  let r = getRuntimeFamilyDefault(e, n);
  return r !== void 0 && HD(r) ? r : void 0;
}
//@ chunk-aepeg2w5.js:138206-138272 placement
function D3(e, n) {
  let r = normalizeModelId(n);
  return catalogModels(e).find((s) => normalizeModelId(s.id) === r);
}
//@ chunk-aepeg2w5.js:138272-138359 placement
function YSi(e, n) {
  let r = D3(e, n);
  return r?.runtime?.max_input_tokens ?? r?.context_window;
}
//@ chunk-aepeg2w5.js:138359-138420 placement
function Los(e, n) {
  return D3(e, n)?.runtime?.max_output_tokens;
}
/**
 * 读取目录中模型的默认输出 token 数。
 */
//@ chunk-aepeg2w5.js:138420-138536 placement
function getDefaultOutputTokens(e, n) {
  let r = D3(e, n)?.runtime?.default_output_tokens;
  return r !== void 0 && Number.isFinite(r) && r > 0 ? r : void 0;
}
/**
 * 读取目录中模型的默认 effort 等级。
 */
//@ chunk-aepeg2w5.js:138536-138642 placement
function getDefaultEffort(e, n) {
  let r = D3(e, n)?.runtime?.default_effort?.trim().toLowerCase();
  return EFFORT_LEVELS.find((s) => s === r);
}
//@ chunk-aepeg2w5.js:138642-138701 placement
function lto(e) {
  return catalogModels(e).some((n) => n.runtime !== void 0);
}
//@ chunk-aepeg2w5.js:138701-138791 placement
function QSi(e) {
  return new Set(
    catalogModels(e)
      .filter((n) => n.confidential === !0)
      .map((n) => normalizeModelId(n.id)),
  );
}
//@ chunk-aepeg2w5.js:138791-138880 placement
function Uy(e) {
  return new Set(
    catalogModels(e)
      .filter((n) => n.confidential !== !0)
      .map((n) => normalizeModelId(n.id)),
  );
}
//@ chunk-1wpnxx5r.js:770-799 placement
var E = (e) => JSON.stringify(e);
/**
 * api.anthropic.com、api-staging.anthropic.com；同句 ue 再加 OAuth 允许的 base URL 主机。
 */
//@ chunk-1wpnxx5r.js:799-920 fingerprint = isFirstPartyAnthropicBaseUrl (0.642)
var FIRST_PARTY_API_HOSTS = new Set(["api.anthropic.com", "api-staging.anthropic.com"]),
  ALLOWED_API_HOSTS = new Set([
    ...FIRST_PARTY_API_HOSTS,
    ...ALLOWED_OAUTH_BASE_URLS.map((e) => new URL(e).hostname),
  ]);

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
  assumesFirstPartyBaseUrl,
  isGenuineBedrockEndpoint,
  FIRST_PARTY_API_HOSTS,
  E,
  ALLOWED_API_HOSTS,
  catalogModels,
  BD,
  activeCatalogModels,
  providerCatalogKey,
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
  hasCustomBaseUrlForAnalytics,
  modelIdsAreOpaque,
  THIRD_PARTY_PROVIDER_ENV_VARS,
  isClaudePlatformProvider,
  providerReadsClientData,
  Uy,
  getRowFamily,
  Fy,
  hi,
  Dy,
  Iy,
  Oc,
  getProviderAliasTargets,
  hasProviderAliasTarget,
  providerEndpointOverrides,
  allowedProviderNameOf,
  providerEndpointVariables,
  isProviderServiceUrl,
  routesOffAnthropicApiWith,
  ato,
};
