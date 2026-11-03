/**
 * utils/model/modelStrings.ts
 *
 * 当前提供商下每个模型键对应的模型字符串（Bedrock 按区域前缀与推理配置文件解析），以及 settings.modelOverrides 的应用与反查。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/model/modelStrings.ts
 * pieces: chunk-aepeg2w5.js (13)
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
import { getInitialSettings_2 } from "../settings/settings.js";
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

//@ chunk-aepeg2w5.js:229259-229282 file-local
/**
 * 所有 catalog 模型键。
 */
var MODEL_KEYS = Object.keys(catalogEntriesByFirstPartyId);
//@ chunk-aepeg2w5.js:229282-229471 fingerprint = getBedrockModelStrings (1)
/**
 * 某提供商的模型字符串表（旧版名 getBedrockModelStrings 只覆盖 Bedrock，316 对所有提供商通用）：该提供商没有该模型时借用最先有值模型的同提供商 id 或第一方 id；Bedrock 加区域前缀（ANTHROPIC_BEDROCK_REGION_PREFIX 或按 AWS 区域推断）。
 */
function getModelStringsForProvider(provider, awsRegion) {
  let found = MODEL_KEYS.find((y) => catalogEntriesByFirstPartyId[y][provider] !== null);
  let s = provider === "bedrock" ? getBedrockRegionPrefix(awsRegion ?? getAwsRegionSync()) : undefined;
  let out = {};
  for (let key of MODEL_KEYS) {
    let S =
      catalogEntriesByFirstPartyId[key][provider] ??
      (found ? catalogEntriesByFirstPartyId[found][provider] : catalogEntriesByFirstPartyId[key].firstParty);
    out[key] = identityModelId(s ? withBedrockRegionPrefix(S, s) : S);
  }
  return out;
}
//@ chunk-aepeg2w5.js:229471-230421 layout
/**
 * 列出 Bedrock 系统推理配置文件，为每个模型找匹配前缀的 profile，找不到用硬编码；首选前缀不可用时告警。
 */
async function getBedrockModelStringsFromProfiles() {
  let awsRegion = await resolveAwsRegion();
  let bedrockRegionPrefix = getBedrockRegionPrefix(awsRegion);
  let r = bedrockRegionGroup(awsRegion);
  let modelStringsForProvider = getModelStringsForProvider("bedrock", awsRegion);
  let h = () => {
    if (bedrockRegionPrefix !== r)
      logForDebugging(
        `ANTHROPIC_BEDROCK_REGION_PREFIX=${bedrockRegionPrefix} is being applied without an availability check (inference-profile discovery is unavailable). If requests 400, ensure ${bedrockRegionPrefix}.* cross-region inference profiles are enabled in this account, or unset the variable to fall back to ${r}.*.`,
        {
          level: "warn",
        },
      );
  };
  let y;
  try {
    y = await getBedrockInferenceProfiles();
  } catch (error) {
    logForDebugging(
      `Failed to list Bedrock inference profiles, falling back to hardcoded models: ${error instanceof Error ? error.message : String(error)}`,
      {
        level: "error",
      },
    );
    h();
    return modelStringsForProvider;
  }
  if (!y?.length) {
    h();
    return modelStringsForProvider;
  }
  let S = {};
  let w = [];
  for (let R of MODEL_KEYS) {
    let firstParty = catalogEntriesByFirstPartyId[R].firstParty;
    let P = findFirstMatch(y, firstParty, bedrockRegionPrefix) || modelStringsForProvider[R];
    S[R] = identityModelId(P);
    if (bedrockRegionPrefix !== r && !P.startsWith(`${bedrockRegionPrefix}.`)) w.push(firstParty);
  }
  if (w.length > 0)
    logForDebugging(
      `ANTHROPIC_BEDROCK_REGION_PREFIX=${bedrockRegionPrefix}: ${w.length} model(s) resolved to a different prefix (no ${bedrockRegionPrefix}.* profile in this account): ${w.join(", ")}. This is a preference, not a residency guarantee.`,
      {
        level: "warn",
      },
    );
  return S;
}
//@ chunk-aepeg2w5.js:230421-230564 fingerprint = applyModelOverrides (1)
/**
 * 把 settings.modelOverrides（第一方 id 到自定义 id）应用到模型字符串表。
 */
function applyModelOverrides(ms) {
  let overrides = getInitialSettings_2().modelOverrides;
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
//@ chunk-aepeg2w5.js:230564-230704 layout = applyModelOverrides (1)
/**
 * 自定义 id 反查回 modelOverrides 的第一方键。
 */
function reverseModelOverride(modelId) {
  let overrides;
  try {
    overrides = getInitialSettings_2().modelOverrides;
  } catch {
    return modelId;
  }
  if (!overrides) return modelId;
  for (let [canonicalId, override] of Object.entries(overrides))
    if (sameModelSpelling(override, modelId)) return canonicalId;
  return modelId;
}
//@ chunk-aepeg2w5.js:230704-230819 layout = getModelBetas (1)
/**
 * 惰性执行一次：模型字符串缓存为空时取 Bedrock 推理配置文件并写回缓存（仅 bedrock）。
 */
var refreshBedrockModelStrings = serializeCalls(async () => {
  if (getModelStrings_2() !== null) return;
  try {
    let modelBetas = await getBedrockModelStringsFromProfiles();
    if (getAPIProvider() !== "bedrock") return;
    setModelStrings(modelBetas);
  } catch (error) {
    logError(error);
  }
});
//@ chunk-aepeg2w5.js:230819-230903 callgraph-fingerprint = initModelStrings (1)
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
//@ chunk-aepeg2w5.js:230903-230979 layout
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
//@ chunk-aepeg2w5.js:230979-231048 layout
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
//@ chunk-aepeg2w5.js:231048-231241 callgraph-fingerprint = ensureModelStringsInitialized (0.576)
/**
 * 确保模型字符串已初始化（Bedrock 等待 profile 发现；宿主托管提供商时只取区域）。
 */
async function ensureModelStringsInitialized(e) {
  if (getModelStrings_2() !== null) return;
  if (getAPIProvider() !== "bedrock") {
    setModelStrings(getModelStringsForProvider(getAPIProvider()));
    return;
  }
  if (env.CLAUDE_CODE_PROVIDER_MANAGED_BY_HOST && e?.sessionModelIsProviderId) {
    await resolveAwsRegion();
    initModelStrings();
    return;
  }
  await refreshBedrockModelStrings();
}
//@ chunk-aepeg2w5.js:231241-231351 file-local
/**
 * 该模型在提供商下有 id，或 modelOverrides 为其第一方 id 配置了覆盖。auto 名 resolveOverriddenModel 不准确。
 */
function isModelAvailableOnProvider(key, apiProvider = getAPIProvider()) {
  let r = catalogEntriesByFirstPartyId[key];
  if (r[apiProvider] !== null) return true;
  return Boolean(getInitialSettings_2().modelOverrides?.[r.firstParty]);
}
//@ chunk-aepeg2w5.js:231351-231570 layout = applyModelOverrides (1)
/**
 * 把目录条目解析成当前提供商的模型 id：第一方/网关用 id；已知键看可用性；否则 modelOverrides 或目录提供商 id。旧版名 applyModelOverrides_3 为错配。
 */
function resolveProviderModelId(e, n) {
  let apiProvider = getAPIProvider();
  if (isCatalogSurfaceBackend(apiProvider)) return e.id;
  let s = entryModelKey(e.id);
  if (s !== undefined) return isModelAvailableOnProvider(s, apiProvider) ? getModelStrings()[s] : undefined;
  let overrides = getInitialSettings_2().modelOverrides;
  let y = overrides !== undefined && Object.hasOwn(overrides, e.id) ? overrides[e.id] : undefined;
  return y && (n ?? hasDescribableCatalogModel(e.id)) ? y : gatewayModelIdFor(e);
}
//@ chunk-aepeg2w5.js:231570-231706 placement
function gatewayModelIdFor(e) {
  let apiProvider = getAPIProvider();
  let providerModelIdForEntry = getProviderModelIdForEntry(e, apiProvider);
  if (providerModelIdForEntry === undefined) return;
  let s = apiProvider === "bedrock" ? toBedrockFoundationModelId(providerModelIdForEntry) : undefined;
  let h = s !== undefined ? resolveWireModelId(s) : providerModelIdForEntry;
  return anyWireVariantKnown(h, apiProvider) ? undefined : h;
}
export {
  getModelStrings,
  resolveProviderModelId,
  getRawModelStrings,
  gatewayModelIdFor,
  ensureModelStringsInitialized,
  reverseModelOverride,
  isModelAvailableOnProvider,
};
