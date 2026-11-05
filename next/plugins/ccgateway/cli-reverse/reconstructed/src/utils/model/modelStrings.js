/**
 * utils/model/modelStrings.ts
 *
 * 当前提供商下每个模型键对应的模型字符串（Bedrock 按区域前缀与推理配置文件解析），以及 settings.modelOverrides 的应用与反查。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/model/modelStrings.ts
 * pieces: chunk-exfmq47h.js (13)
 * attribution: file-local 2, fingerprint 2, layout 6, callgraph-fingerprint 2, placement 1
 */
import { catalogEntriesByFirstPartyId } from "./modelCatalog.js";
import {
  getBedrockRegionPrefix,
  identityModelId,
  withBedrockRegionPrefix,
  bedrockRegionGroup,
  findFirstMatch,
} from "./bedrock.js";
import { getAwsRegionSync, resolveAwsRegion } from "../awsRegion.js";
import { logForDebugging } from "../debug.js";
import { getBedrockInferenceProfiles } from "../../services/analytics/telemetryCredentialGuard.js";
import { getInitialSettings } from "../settings/settings.js";
import { MODEL_KEY_BY_FIRST_PARTY_ID } from "./configs.js";
import { sameModelSpelling } from "./modelIds.js";
import { serializeCalls } from "../promiseQueue.js";
import { getModelStrings as getModelStrings_2, setModelStrings } from "../../bootstrap/state.js";
import { getAPIProvider } from "./providers.js";
import { logError } from "../log.js";
import { env } from "../env.js";
import {
  isCatalogSurfaceBackend,
  entryModelKey,
  getProviderModelIdForEntry,
} from "./modelCatalog/servedCatalog.js";
import { hasDescribableCatalogModel } from "./modelCatalog/catalogCapabilities.js";
import { toBedrockFoundationModelId, anyWireVariantKnown } from "./modelCatalog/catalogSeed.js";
import { resolveWireModelId } from "../../services/gateway/hostCheck.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-exfmq47h.js:238774-238797 file-local
/**
 * 所有 catalog 模型键。
 */
var MODEL_KEYS; // deferred: uses catalogEntriesByFirstPartyId (./modelCatalog.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-exfmq47h.js:238774", () => {
  MODEL_KEYS = Object.keys(catalogEntriesByFirstPartyId);
});
//@ chunk-exfmq47h.js:238797-238986 fingerprint (2.1.88 match: getBedrockModelStrings, 1)
/**
 * 某提供商的模型字符串表（旧版名 getBedrockModelStrings 只覆盖 Bedrock，316 对所有提供商通用）：该提供商没有该模型时借用最先有值模型的同提供商 id 或第一方 id；Bedrock 加区域前缀（ANTHROPIC_BEDROCK_REGION_PREFIX 或按 AWS 区域推断）。
 */
function getModelStringsForProvider(provider, awsRegion) {
  let found = MODEL_KEYS.find((key) => catalogEntriesByFirstPartyId[key][provider] !== null);
  let regionPrefix =
    provider === "bedrock" ? getBedrockRegionPrefix(awsRegion ?? getAwsRegionSync()) : undefined;
  let out = {};
  for (let key of MODEL_KEYS) {
    let modelId =
      catalogEntriesByFirstPartyId[key][provider] ??
      (found ? catalogEntriesByFirstPartyId[found][provider] : catalogEntriesByFirstPartyId[key].firstParty);
    out[key] = identityModelId(regionPrefix ? withBedrockRegionPrefix(modelId, regionPrefix) : modelId);
  }
  return out;
}
//@ chunk-exfmq47h.js:238986-239936 layout
/**
 * 列出 Bedrock 系统推理配置文件，为每个模型找匹配前缀的 profile，找不到用硬编码；首选前缀不可用时告警。
 */
async function getBedrockModelStringsFromProfiles() {
  let awsRegion = await resolveAwsRegion();
  let bedrockRegionPrefix = getBedrockRegionPrefix(awsRegion);
  let regionGroup = bedrockRegionGroup(awsRegion);
  let modelStringsForProvider = getModelStringsForProvider("bedrock", awsRegion);
  let warnAboutUncheckedPrefix = () => {
    if (bedrockRegionPrefix !== regionGroup)
      logForDebugging(
        `ANTHROPIC_BEDROCK_REGION_PREFIX=${bedrockRegionPrefix} is being applied without an availability check (inference-profile discovery is unavailable). If requests 400, ensure ${bedrockRegionPrefix}.* cross-region inference profiles are enabled in this account, or unset the variable to fall back to ${regionGroup}.*.`,
        {
          level: "warn",
        },
      );
  };
  let profiles;
  try {
    profiles = await getBedrockInferenceProfiles();
  } catch (error) {
    logForDebugging(
      `Failed to list Bedrock inference profiles, falling back to hardcoded models: ${error instanceof Error ? error.message : String(error)}`,
      {
        level: "error",
      },
    );
    warnAboutUncheckedPrefix();
    return modelStringsForProvider;
  }
  if (!profiles?.length) {
    warnAboutUncheckedPrefix();
    return modelStringsForProvider;
  }
  let out = {};
  let mismatched = [];
  for (let key of MODEL_KEYS) {
    let firstParty = catalogEntriesByFirstPartyId[key].firstParty;
    let modelId = findFirstMatch(profiles, firstParty, bedrockRegionPrefix) || modelStringsForProvider[key];
    out[key] = identityModelId(modelId);
    if (bedrockRegionPrefix !== regionGroup && !modelId.startsWith(`${bedrockRegionPrefix}.`))
      mismatched.push(firstParty);
  }
  if (mismatched.length > 0)
    logForDebugging(
      `ANTHROPIC_BEDROCK_REGION_PREFIX=${bedrockRegionPrefix}: ${mismatched.length} model(s) resolved to a different prefix (no ${bedrockRegionPrefix}.* profile in this account): ${mismatched.join(", ")}. This is a preference, not a residency guarantee.`,
      {
        level: "warn",
      },
    );
  return out;
}
//@ chunk-exfmq47h.js:239936-240079 fingerprint (2.1.88 match: applyModelOverrides, 1)
/**
 * 把 settings.modelOverrides（第一方 id 到自定义 id）应用到模型字符串表。
 */
function applyModelOverrides(ms) {
  let overrides = getInitialSettings().modelOverrides;
  if (!overrides) return ms;
  let out = {
    ...ms,
  };
  for (let [canonicalId, override] of Object.entries(overrides)) {
    let key = MODEL_KEY_BY_FIRST_PARTY_ID[canonicalId];
    if (key && override) out[key] = identityModelId(override);
  }
  return out;
}
//@ chunk-exfmq47h.js:240079-240219 layout (2.1.88 match: applyModelOverrides, 1)
/**
 * 自定义 id 反查回 modelOverrides 的第一方键。
 */
function reverseModelOverride(modelId) {
  let overrides;
  try {
    overrides = getInitialSettings().modelOverrides;
  } catch {
    return modelId;
  }
  if (!overrides) return modelId;
  for (let [canonicalId, override] of Object.entries(overrides))
    if (sameModelSpelling(override, modelId)) return canonicalId;
  return modelId;
}
//@ chunk-exfmq47h.js:240219-240334 layout (2.1.88 match: getModelBetas, 1)
/**
 * 惰性执行一次：模型字符串缓存为空时取 Bedrock 推理配置文件并写回缓存（仅 bedrock）。
 */
var refreshBedrockModelStrings; // deferred: uses getModelStrings (../../bootstrap/state.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-exfmq47h.js:240219", () => {
  refreshBedrockModelStrings = serializeCalls(async () => {
    if (getModelStrings_2() !== null) return;
    try {
      let modelBetas = await getBedrockModelStringsFromProfiles();
      if (getAPIProvider() !== "bedrock") return;
      setModelStrings(modelBetas);
    } catch (error) {
      logError(error);
    }
  });
});
//@ chunk-exfmq47h.js:240334-240418 callgraph-fingerprint (2.1.88 match: initModelStrings, 1)
/**
 * 初始化模型字符串：非 Bedrock 同步计算并写入状态；Bedrock 异步走推理配置文件发现。
 */
function initModelStrings() {
  if (getModelStrings_2() !== null) return;
  if (getAPIProvider() !== "bedrock") {
    setModelStrings(getModelStringsForProvider(getAPIProvider()));
    return;
  }
  refreshBedrockModelStrings();
}
//@ chunk-exfmq47h.js:240418-240494 layout
/**
 * 当前模型字符串表（已应用 modelOverrides）；未初始化时先初始化。
 */
function getModelStrings() {
  let ms = getModelStrings_2();
  if (ms === null) {
    initModelStrings();
    return applyModelOverrides(getModelStringsForProvider(getAPIProvider()));
  }
  return applyModelOverrides(ms);
}
//@ chunk-exfmq47h.js:240494-240563 layout
/**
 * 未应用 modelOverrides 的模型字符串表。
 */
function getRawModelStrings() {
  let ms = getModelStrings_2();
  if (ms === null) {
    initModelStrings();
    return getModelStringsForProvider(getAPIProvider());
  }
  return ms;
}
//@ chunk-exfmq47h.js:240563-240756 callgraph-fingerprint (2.1.88 match: ensureModelStringsInitialized, 0.576)
/**
 * 确保模型字符串已初始化（Bedrock 等待 profile 发现；宿主托管提供商时只取区域）。
 */
async function ensureModelStringsInitialized(options) {
  if (getModelStrings_2() !== null) return;
  if (getAPIProvider() !== "bedrock") {
    setModelStrings(getModelStringsForProvider(getAPIProvider()));
    return;
  }
  if (env.CLAUDE_CODE_PROVIDER_MANAGED_BY_HOST && options?.sessionModelIsProviderId) {
    await resolveAwsRegion();
    initModelStrings();
    return;
  }
  await refreshBedrockModelStrings();
}
//@ chunk-exfmq47h.js:240756-240866 file-local
/**
 * 该模型在提供商下有 id，或 modelOverrides 为其第一方 id 配置了覆盖。auto 名 resolveOverriddenModel 不准确。
 */
function isModelAvailableOnProvider(key, apiProvider = getAPIProvider()) {
  let entry = catalogEntriesByFirstPartyId[key];
  if (entry[apiProvider] !== null) return true;
  return Boolean(getInitialSettings().modelOverrides?.[entry.firstParty]);
}
//@ chunk-exfmq47h.js:240866-241085 layout (2.1.88 match: applyModelOverrides, 1)
/**
 * 把目录条目解析成当前提供商的模型 id：第一方/网关用 id；已知键看可用性；否则 modelOverrides 或目录提供商 id。旧版名 applyModelOverrides_3 为错配。
 */
function resolveProviderModelId(entry, preferOverride) {
  let provider = getAPIProvider();
  if (isCatalogSurfaceBackend(provider)) return entry.id;
  let key = entryModelKey(entry.id);
  if (key !== undefined)
    return isModelAvailableOnProvider(key, provider) ? getModelStrings()[key] : undefined;
  let overrides = getInitialSettings().modelOverrides;
  let override =
    overrides !== undefined && Object.hasOwn(overrides, entry.id) ? overrides[entry.id] : undefined;
  return override && (preferOverride ?? hasDescribableCatalogModel(entry.id))
    ? override
    : gatewayModelIdFor(entry);
}
//@ chunk-exfmq47h.js:241085-241221 placement
function gatewayModelIdFor(entry) {
  let provider = getAPIProvider();
  let providerModelIdForEntry = getProviderModelIdForEntry(entry, provider);
  if (providerModelIdForEntry === undefined) return;
  let foundationId = provider === "bedrock" ? toBedrockFoundationModelId(providerModelIdForEntry) : undefined;
  let wireId = foundationId !== undefined ? resolveWireModelId(foundationId) : providerModelIdForEntry;
  return anyWireVariantKnown(wireId, provider) ? undefined : wireId;
}
export {
  ensureModelStringsInitialized,
  reverseModelOverride,
  getModelStrings,
  resolveProviderModelId,
  getRawModelStrings,
  gatewayModelIdFor,
  isModelAvailableOnProvider,
};
