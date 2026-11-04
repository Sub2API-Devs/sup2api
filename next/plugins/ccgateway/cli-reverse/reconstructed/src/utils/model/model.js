/**
 * utils/model/model.ts
 *
 * 主循环模型选择核心：用户指定模型（--model / /model / ANTHROPIC_MODEL / settings.model）解析、别名展开、各档默认模型（Opus/Sonnet/Haiku/Fable）、[1m] 后缀处理、显示名与营销名、旧 Opus 重映射。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/model/model.ts
 * pieces: chunk-095ptjmr.js (1), chunk-aepeg2w5.js (64), chunk-d1cgs5na.js (1), chunk-e6aww6q8.js (2), chunk-hwmsct5x.js (1)
 * attribution: fingerprint 10, placement 57, layout 2
 */
import { env } from "../env.js";
import {
  sameModelSpelling,
  strip1mSuffix,
  isModelKeyAlias,
  isModelKeyAliasOrResolved,
  parseModelId,
  stripAnyVersatileSuffix,
  MODEL_KEY_NAMES,
} from "./modelIds.js";
import {
  getCuratedModelPicker,
  parseUserSpecifiedModel,
  getClaudeAiUserDefaultModelDescription,
  getCatalogDisplayName,
  getPublicModelDisplayName,
} from "./modelDisplay.js";
import { getAdditionalModelOptionsCache, hasBootstrapModelOptions, isClaudeAISubscriber } from "../auth.js";
import { getProviderState } from "./providerCaches.js";
import {
  getSettingsModelOverrides,
  getCanonicalName,
  findOverrideCanonicalName,
  isRecognizedCanonical,
} from "./canonicalModelName.js";
import {
  getPairedPolicyModelOverrides,
  getSettingsForSource,
  getInitialSettings_2,
} from "../settings/settings.js";
import {
  noCatalogAliasTarget,
  neverUnavailable,
  noCatalogBehavesAs,
  isCatalogRowSelectable,
  hasDescribableCatalogModel,
} from "./modelCatalog/catalogCapabilities.js";
import { getUserSpecifiedModelSetting, isNonCustomMythosModel } from "./smallFastModel.js";
import { getDefaultMainLoopModel } from "./modelFallback.js";
import { getModelCatalog, catalogEntriesByFirstPartyId, getCatalogEntry } from "./modelCatalog.js";
import { isModelAllowed } from "./modelAllowlist.js";
import {
  isEffectiveCatalogActive,
  isServedCatalogActive,
  activeServedCatalog,
  activeCatalogModels,
  findServedModel,
  entryModelKey,
  findEffectiveServedEntry,
  servedMaxInputTokens,
} from "./modelCatalog/servedCatalog.js";
import {
  getAPIProvider,
  isFirstPartyAnthropicBaseUrl,
  isActiveCatalogModel,
  isFirstPartyApiBackend,
  usesFirstPartyModelIds,
} from "./providers.js";
import {
  getModelStrings,
  resolveProviderModelId,
  getRawModelStrings,
  gatewayModelIdFor,
} from "./modelStrings.js";
import {
  OPUS_FALLBACK_ORDER as OPUS_FALLBACK_ORDER_2,
  MODEL_KEY_BY_FIRST_PARTY_ID,
  isContextWindow1m,
  getSonnet46ContextWindowOverride,
} from "./configs.js";
import {
  inherit1mSuffix,
  ultraplanModelOrUndefined,
  catalogFamilyDefaultKey,
  antGrants1MContext,
} from "./classifierModel.js";
import { identityModelId } from "./bedrock.js";
import { sanitizeTitle } from "../resultError.js";
import {
  modelHasNative1MContext,
  has1mSuffix_2,
  supports1mBeta,
  has1mSuffix,
  is1mContextDisabled,
} from "./contextWindow1m.js";
import { getDefaultSonnetBuiltin } from "./modelOptions.js";
import { append1mSuffixIfMissing, getDefaultHaikuModel, getRuntimeMainLoopModel } from "./planModeModel.js";
import {
  isExemptDefaultResolvingPick,
  getModelEnforcementState,
  isModelDeniedByManagedFalse,
} from "./defaultModel.js";
import { logForDebugging } from "../debug.js";
import { gatewayCatalogRowId } from "../../services/gateway/hostCheck.js";
import { isLongContext1mCreditsBlocked } from "../../bootstrap/state.js";
import { getFeatureValue_SESSION_PINNED } from "../../services/analytics/growthbook.js";
import { TENGU_KIND_DEWDROP } from "../../services/api/withRetry.js";
import { shouldEmitEnvironmentChanges } from "../attachments/environmentChange.js";
import { messagesSinceCompactBoundary } from "../../services/projects/threadRows.js";
import {
  getToolPermissionContext,
  getMainLoopModel as getMainLoopModel_2,
} from "../permissions/toolPermissionContext.js";
import { modelInfoForModel } from "../contextAttachments/modelInfo.js";
import { doesMostRecentAssistantMessageExceed200k } from "../tokens.js";
import {
  getLastModelIdentity,
  isSameModelIdentity,
  buildModelEnvInfoAttachment,
} from "../../constants/prompts.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-aepeg2w5.js:420461-420644 fingerprint (2.1.88 match: getDefaultHaikuModel, 0.317)
/**
 * 模型是否等于某档 ANTHROPIC_DEFAULT_{FABLE,OPUS,SONNET,HAIKU}_MODEL。旧版名 getDefaultHaikuModel 为错配。
 */
function isTierDefaultModelEnv(model) {
  return [
    env.ANTHROPIC_DEFAULT_FABLE_MODEL,
    env.ANTHROPIC_DEFAULT_OPUS_MODEL,
    env.ANTHROPIC_DEFAULT_SONNET_MODEL,
    env.ANTHROPIC_DEFAULT_HAIKU_MODEL,
  ].some((envModel) => envModel !== undefined && sameModelSpelling(envModel, model));
}
//@ chunk-aepeg2w5.js:429528-429584 placement
/**
 * 模型写法规范化：trim、小写并去掉修饰后缀。
 */
function normalizeModelSpelling(model) {
  return strip1mSuffix(model.trim().toLowerCase()).trim();
}
//@ chunk-aepeg2w5.js:429584-429904 layout
/**
 * 判断（规范化后的）模型名是否为已知的自定义模型：ANTHROPIC_CUSTOM_MODEL_OPTION、精选选择器选项、模型覆盖目标、附加模型选项缓存或已验证过的模型。
 */
function isKnownCustomModel(normalized) {
  let ANTHROPIC_CUSTOM_MODEL_OPTION = env.ANTHROPIC_CUSTOM_MODEL_OPTION;
  if (
    ANTHROPIC_CUSTOM_MODEL_OPTION !== undefined &&
    normalizeModelSpelling(ANTHROPIC_CUSTOM_MODEL_OPTION) === normalized
  )
    return true;
  if (
    getCuratedModelPicker()?.picker.options.some(
      (option) => normalizeModelSpelling(option.model) === normalized,
    ) ??
    false
  )
    return true;
  if (isModelOverrideTarget(normalized)) return true;
  if (
    getAdditionalModelOptionsCache().some(
      (option) => typeof option.value === "string" && normalizeModelSpelling(option.value) === normalized,
    )
  )
    return true;
  for (let validatedModel of getProviderState().providerCache.validatedModels)
    if (normalizeModelSpelling(validatedModel) === normalized) return true;
  return false;
}
//@ chunk-aepeg2w5.js:429904-430061 placement
/**
 * 判断模型名是否为某个模型覆盖设置的目标值。
 */
function isModelOverrideTarget(model) {
  let normalized = normalizeModelSpelling(model);
  if (normalized === "") return false;
  for (let overrides of [getSettingsModelOverrides(), getPairedPolicyModelOverrides()])
    for (let value of Object.values(overrides ?? {}))
      if (typeof value === "string" && normalizeModelSpelling(value) === normalized) return true;
  return false;
}
//@ chunk-aepeg2w5.js:430061-430111 placement
function isUnservedFamilySpelling(model) {
  return noCatalogAliasTarget(model)?.kind === "unresolved";
}
//@ chunk-aepeg2w5.js:430111-430167 placement
function isUnservedModelSpelling(model, source) {
  return isUnservedFamilySpelling(model) || (source === "persisted" && neverUnavailable(model));
}
//@ chunk-aepeg2w5.js:430167-430205 placement
function isServedExpandedSpelling(model) {
  return noCatalogBehavesAs(model) !== undefined;
}
//@ chunk-aepeg2w5.js:430205-430279 placement
function getMainLoopModel() {
  let userSpecifiedModelSetting = getUserSpecifiedModelSetting();
  if (userSpecifiedModelSetting !== undefined && userSpecifiedModelSetting !== null)
    return parseUserSpecifiedModel(userSpecifiedModelSetting);
  return getDefaultMainLoopModel();
}
//@ chunk-aepeg2w5.js:430279-430359 placement
/**
 * 模型族可用性与默认模型查询表（当前只有 fable）。
 */
var FAMILY_AVAILABILITY = {
  fable: {
    available: isFableAvailable,
    defaultModel: () => getDefaultFableModel(),
    builtinDefault: (modelStrings) => getDefaultFableBuiltin(modelStrings),
  },
};
//@ chunk-aepeg2w5.js:430359-430466 placement
/**
 * 返回目录推荐且可用的最佳别名，否则 opus。
 */
function getBestAvailableAlias() {
  let best = getModelCatalog().best;
  if (
    best !== undefined &&
    Object.hasOwn(FAMILY_AVAILABILITY, best) &&
    FAMILY_AVAILABILITY[best]?.available()
  )
    return best;
  return "opus";
}
//@ chunk-aepeg2w5.js:430466-430664 placement
function getDefaultMainLoopModelSetting_2() {
  let family = FAMILY_AVAILABILITY[getBestAvailableAlias()];
  if (family !== undefined) {
    let model = family.defaultModel();
    let providerState = getProviderState();
    if (providerState.resolvingBestModel) return model;
    providerState.resolvingBestModel = true;
    try {
      if (isModelAllowed(model)) return model;
    } finally {
      providerState.resolvingBestModel = false;
    }
  }
  return getDefaultOpusModel();
}
//@ chunk-aepeg2w5.js:430664-430762 placement
var DEFAULT_3P_OPUS_KEY = "opus46";
var DEFAULT_3P_SONNET_KEY = "sonnet45";
var DEFAULT_3P_HAIKU_KEY = "haiku45";
var DEFAULT_BEDROCK_OPUS_KEY = "opus55";
var DEFAULT_VERTEX_OPUS_KEY = "opus55";
var DEFAULT_MANTLE_OPUS_KEY = "opus55";
var DEFAULT_3P_FABLE_KEY = "fable51";
//@ chunk-aepeg2w5.js:430762-430813 placement
function isFableModelValue(value) {
  return value.includes("claude-fable-");
}
//@ chunk-aepeg2w5.js:430813-430865 placement
function isMythosModelValue(value) {
  return value.includes("claude-mythos-");
}
//@ chunk-aepeg2w5.js:430865-431253 placement
function isFableAvailable() {
  if (isEffectiveCatalogActive()) {
    if (!isServedCatalogActive() && (getAPIProvider() !== "firstParty" || !isFirstPartyAnthropicBaseUrl()))
      return Boolean(env.ANTHROPIC_DEFAULT_FABLE_MODEL);
    if (
      isServedCatalogModelInactive(
        isFableModelValue,
        getCanonicalName(getDefaultFableModel(), {
          identity: true,
        }),
      )
    )
      return false;
    if (!isServedCatalogActive() && isDefaultFableOptionDisabled()) return false;
    if (env.ANTHROPIC_DEFAULT_FABLE_MODEL) return true;
    return catalogHasSelectableMatching(isFableModelValue);
  }
  if (isDefaultFableOptionDisabled()) return false;
  if (env.ANTHROPIC_DEFAULT_FABLE_MODEL) return true;
  switch (getAPIProvider()) {
    case "firstParty":
      return true;
    case "gateway":
      return hasEnabledModelOptionMatching(isFableModelValue);
    default:
      return false;
  }
}
//@ chunk-aepeg2w5.js:431253-431295 placement
function hasExtraModelOptions() {
  return getAdditionalModelOptionsCache().length > 0 || hasBootstrapModelOptions();
}
//@ chunk-aepeg2w5.js:431295-431388 placement
function hasEnabledModelOptionMatching(isFableModelValue) {
  return getAdditionalModelOptionsCache().some(
    (option) =>
      option.disabled !== true && typeof option.value === "string" && isFableModelValue(option.value),
  );
}
//@ chunk-aepeg2w5.js:431388-431608 placement
function isDefaultFableOptionDisabled() {
  if (getAPIProvider() !== "firstParty" || !isFirstPartyAnthropicBaseUrl()) return false;
  let filtered = getAdditionalModelOptionsCache().filter(
    (option) => typeof option.value === "string" && isFableModelValue(option.value),
  );
  let canonicalName = getCanonicalName(getDefaultFableModel(), {
    identity: true,
  });
  return allMatchAfterFilter(
    filtered,
    (option) =>
      getCanonicalName(String(option.value), {
        identity: true,
      }) === canonicalName,
    (option) => option.disabled === true,
  );
}
//@ chunk-aepeg2w5.js:431608-431692 placement
function allMatchAfterFilter(items, matches, predicate) {
  let filtered = items.filter(matches);
  let candidates = filtered.length > 0 ? filtered : items;
  return candidates.length > 0 && candidates.every(predicate);
}
//@ chunk-aepeg2w5.js:431692-431834 placement
function isServedCatalogModelInactive(matchesId, canonical) {
  if (activeServedCatalog() === null) return false;
  let filtered = activeCatalogModels().filter((row) => matchesId(row.id));
  return allMatchAfterFilter(
    filtered,
    (row) =>
      canonical !== undefined &&
      getCanonicalName(row.id, {
        identity: true,
      }) === canonical,
    (row) => !isActiveCatalogModel(row),
  );
}
//@ chunk-aepeg2w5.js:431834-432395 placement
function isMythosAvailable(model) {
  if (getAPIProvider() !== "firstParty" || !isFirstPartyAnthropicBaseUrl()) return false;
  let asMythos = (canonicalName) => (isNonCustomMythosModel(canonicalName) ? canonicalName : undefined);
  let canonical =
    model === undefined
      ? undefined
      : asMythos(
          getCanonicalName(model, {
            identity: true,
          }),
        );
  let anyEnabled = (entries) => {
    let filtered = entries.filter((entry) => entry.canonical === canonical);
    return (filtered.length > 0 ? filtered : entries).some((entry) => entry.enabled);
  };
  let anyServedCatalogEntryEnabled = () => {
    let catalog = activeServedCatalog();
    return anyEnabled(
      activeCatalogModels().flatMap((row) => {
        let mythosCanonical = asMythos(getCanonicalName(row.id));
        return mythosCanonical && catalog !== null
          ? [
              {
                canonical: mythosCanonical,
                enabled: isCatalogRowSelectable(catalog, row),
              },
            ]
          : [];
      }),
    );
  };
  if (isServedCatalogActive()) return anyServedCatalogEntryEnabled();
  if (isEffectiveCatalogActive()) {
    if (isServedCatalogModelInactive(isMythosModelValue, canonical)) return false;
    if (!hasExtraModelOptions()) return anyServedCatalogEntryEnabled();
  }
  return anyEnabled(
    getAdditionalModelOptionsCache().flatMap((option) => {
      let mythosCanonical =
        typeof option.value === "string"
          ? asMythos(
              getCanonicalName(option.value, {
                identity: true,
              }),
            )
          : undefined;
      return mythosCanonical
        ? [
            {
              canonical: mythosCanonical,
              enabled: option.disabled !== true,
            },
          ]
        : [];
    }),
  );
}
//@ chunk-aepeg2w5.js:432395-432483 placement
function catalogHasSelectableMatching(isFableModelValue) {
  let catalog = activeServedCatalog();
  if (catalog === null) return false;
  return activeCatalogModels().some(
    (row) => isCatalogRowSelectable(catalog, row) && isFableModelValue(row.id),
  );
}
//@ chunk-aepeg2w5.js:432483-432573 placement
function isPinnedFableModel(model) {
  let ANTHROPIC_DEFAULT_FABLE_MODEL = env.ANTHROPIC_DEFAULT_FABLE_MODEL;
  if (!ANTHROPIC_DEFAULT_FABLE_MODEL) return false;
  return strip1mSuffix(model) === strip1mSuffix(ANTHROPIC_DEFAULT_FABLE_MODEL);
}
//@ chunk-aepeg2w5.js:432573-432673 placement
function isFableFamilyOrPinnedModel(model, options) {
  return (
    getCanonicalName(
      model,
      options?.identity
        ? {
            identity: true,
          }
        : undefined,
    ).startsWith("claude-fable-") || isPinnedFableModel(model)
  );
}
//@ chunk-aepeg2w5.js:432673-432730 placement
/**
 * 判断模型值是否属于 mythos 系列。
 */
function isMythosModelValue_2(model) {
  return getCanonicalName(model).startsWith("claude-mythos-");
}
//@ chunk-aepeg2w5.js:432730-432781 placement
function isOpus5FamilyModel(model) {
  return strip1mSuffix(getCanonicalName(model)) === "claude-opus-5";
}
//@ chunk-aepeg2w5.js:432781-432834 placement
function isOpus55FamilyModel(model) {
  return strip1mSuffix(getCanonicalName(model)) === "claude-opus-5-5";
}
//@ chunk-aepeg2w5.js:432834-432889 placement
function isSonnet55FamilyModel(modelName) {
  return strip1mSuffix(getCanonicalName(modelName)) === "claude-sonnet-5-5";
}
//@ chunk-aepeg2w5.js:432889-432958 placement
function isLegacy46Model(canonicalName) {
  return canonicalName === "claude-opus-4-6" || canonicalName === "claude-sonnet-4-6";
}
//@ chunk-aepeg2w5.js:432958-432983 placement
function isAntInternalFastModelId(modelId) {
  return false;
}
//@ chunk-aepeg2w5.js:432983-432998 layout
/**
 * catalog 键 "opus5"。
 */
var OPUS5_KEY = "opus5";
//@ chunk-aepeg2w5.js:432998-433227 fingerprint (2.1.88 match: getDefaultOpusModel, 0.711)
/**
 * 默认 Opus（带上下文后缀继承）：ANTHROPIC_DEFAULT_OPUS_MODEL，否则第一方从 opus5 起按 OPUS_FALLBACK_ORDER 轮转取第一个被允许的 Opus 字符串；与 n 的 [1m] 一致化。
 */
function resolveDefaultOpusModel(currentModel) {
  let ANTHROPIC_DEFAULT_OPUS_MODEL = env.ANTHROPIC_DEFAULT_OPUS_MODEL;
  if (ANTHROPIC_DEFAULT_OPUS_MODEL === undefined) {
    let modelStrings = getModelStrings();
    ANTHROPIC_DEFAULT_OPUS_MODEL = modelStrings[OPUS5_KEY];
    if (getAPIProvider() === "firstParty") {
      let index = OPUS_FALLBACK_ORDER_2.indexOf(OPUS5_KEY);
      ANTHROPIC_DEFAULT_OPUS_MODEL =
        OPUS_FALLBACK_ORDER_2.slice(index)
          .concat(OPUS_FALLBACK_ORDER_2.slice(0, index))
          .map((key) => modelStrings[key])
          .find((candidate) => isModelAllowed(candidate)) ?? modelStrings[OPUS5_KEY];
    }
  }
  return inherit1mSuffix(identityModelId(ANTHROPIC_DEFAULT_OPUS_MODEL), currentModel);
}
//@ chunk-aepeg2w5.js:436867-437117 placement (2.1.88 match: aliasMatchesParentTier, 0.852)
/**
 * 档位别名（opus/sonnet/haiku/fable）在 settings 档位覆盖里配置的模型：映射到 catalog 键则取模型字符串表中的值，否则解析成提供商 id。
 */
function getTierOverrideModel(alias, parentModel) {
  if (alias !== "opus" && alias !== "sonnet" && alias !== "haiku" && alias !== "fable") return;
  let canonical = ultraplanModelOrUndefined(alias);
  if (canonical === undefined) return;
  let lower = canonical.toLowerCase();
  let key = Object.hasOwn(MODEL_KEY_BY_FIRST_PARTY_ID, lower)
    ? MODEL_KEY_BY_FIRST_PARTY_ID[lower]
    : undefined;
  if (key !== undefined) return parentModel[key];
  let providerModelId = resolveProviderModelId(
    findServedModel(canonical) ?? {
      id: canonical,
    },
  );
  return providerModelId === undefined ? undefined : identityModelId(providerModelId);
}
//@ chunk-aepeg2w5.js:437117-437150 placement
/**
 * 取某档位被覆盖后的模型。
 */
function tierOverrideModel(alias) {
  return getTierOverrideModel(alias, getModelStrings());
}
//@ chunk-aepeg2w5.js:437150-437503 placement
function documentTierAliasTarget(alias) {
  if (activeServedCatalog() === null) return;
  let canonical = ultraplanModelOrUndefined(alias);
  if (canonical === undefined) return;
  let lower = canonical.toLowerCase();
  let key = Object.hasOwn(MODEL_KEY_BY_FIRST_PARTY_ID, lower)
    ? MODEL_KEY_BY_FIRST_PARTY_ID[lower]
    : undefined;
  if (key !== undefined)
    return {
      key,
      name: displayNameForModel(canonical, key),
    };
  let served = findServedModel(canonical) ?? {
    id: canonical,
  };
  let entryKey = entryModelKey(served.id);
  if (entryKey !== undefined)
    return {
      key: entryKey,
      name: displayNameForModel(canonical, entryKey),
    };
  let providerModelId = resolveProviderModelId(served);
  return providerModelId === undefined
    ? undefined
    : {
        key: undefined,
        modelId: providerModelId,
        ...(hasDescribableCatalogModel(served.id) && {
          overrideKey: served.id,
        }),
        name: displayNameForModel(canonical, undefined),
      };
}
//@ chunk-aepeg2w5.js:437503-437597 placement
/**
 * 取模型的展示名（营销名或目录名，兜底 "that model"）。
 */
function displayNameForModel(model, key) {
  return (
    getMarketingNameForModel(key !== undefined ? catalogEntriesByFirstPartyId[key].firstParty : model) ??
    (sanitizeTitle(findServedModel(model)?.name ?? model) || "that model")
  );
}
//@ chunk-aepeg2w5.js:437597-437696 placement
function getDefaultFableModel() {
  let model = env.ANTHROPIC_DEFAULT_FABLE_MODEL ?? tierOverrideModel("fable");
  return identityModelId(model !== undefined ? strip1mWhenNative(model) : getDefaultFableBuiltin());
}
//@ chunk-aepeg2w5.js:437696-437765 placement
function strip1mTagWhereBuiltIn(model) {
  let stripped = strip1mTag(model);
  return stripped !== model &&
    modelHasNative1MContext(stripped, {
      byItsOwnName: true,
    })
    ? stripped
    : model;
}
//@ chunk-aepeg2w5.js:437765-437858 placement
function strip1mWhenNative(model) {
  let stripped = strip1mTag(model);
  if (stripped === model) return model;
  return modelHasNative1MContext(stripped, {
    byItsOwnName: true,
  }) ||
    (isFirstPartyApiBackend() && neverHasNative1m(stripped))
    ? stripped
    : model;
}
//@ chunk-aepeg2w5.js:437858-437882 placement
function neverHasNative1m(model) {
  return false;
}
//@ chunk-aepeg2w5.js:437882-437946 placement
/**
 * 取默认 Fable 模型（目录档位或内置默认，并处理 1M 后缀）。
 */
function getDefaultFableBuiltin(modelStrings = getModelStrings()) {
  let model = catalogFamilyDefaultKey("fable", modelStrings) ?? modelStrings.fable51;
  return strip1mWhenNative(model);
}
//@ chunk-aepeg2w5.js:437946-438052 placement
function getDefaultOpusModel() {
  let ANTHROPIC_DEFAULT_OPUS_MODEL = env.ANTHROPIC_DEFAULT_OPUS_MODEL;
  if (ANTHROPIC_DEFAULT_OPUS_MODEL !== undefined)
    return identityModelId(strip1mTagWhereBuiltIn(ANTHROPIC_DEFAULT_OPUS_MODEL));
  return tierOverrideModel("opus") ?? getDefaultOpusBuiltin();
}
//@ chunk-aepeg2w5.js:438052-438102 placement
/**
 * 取默认 Opus 模型（目录档位或内置默认）。
 */
function getDefaultOpusBuiltin(rawModelStrings = getModelStrings()) {
  return catalogFamilyDefaultKey("opus", rawModelStrings) ?? rawModelStrings.opus55;
}
//@ chunk-aepeg2w5.js:438102-438212 placement (2.1.88 match: getDefaultSonnetModel, 0.276)
/**
 * 默认 Sonnet：ANTHROPIC_DEFAULT_SONNET_MODEL，否则 settings 档位覆盖，否则 catalog sonnet 档（第一方 claude-sonnet-5-5）。
 */
function getDefaultSonnetModel() {
  let ANTHROPIC_DEFAULT_SONNET_MODEL = env.ANTHROPIC_DEFAULT_SONNET_MODEL;
  if (ANTHROPIC_DEFAULT_SONNET_MODEL !== undefined)
    return identityModelId(strip1mTagWhereBuiltIn(ANTHROPIC_DEFAULT_SONNET_MODEL));
  return tierOverrideModel("sonnet") ?? getDefaultSonnetBuiltin();
}
//@ chunk-aepeg2w5.js:459417-459696 fingerprint (2.1.88 match: firstPartyNameToCanonical, 0.849)
/**
 * 一组旧模型规范名；getAgentToolCallFormatVersion 一类判断（命中返回 4，否则 3）用。旧版名 firstPartyNameToCanonical 为错配。
 */
var LEGACY_SUBAGENT_MODEL_IDS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-aepeg2w5.js:459417", () => {
  LEGACY_SUBAGENT_MODEL_IDS = new Set([
    "claude-3-opus",
    "claude-3-sonnet",
    "claude-3-haiku",
    "claude-3-5-sonnet",
    "claude-3-5-haiku",
    "claude-3-7-sonnet",
    "claude-opus-4-0",
    "claude-opus-4-1",
    "claude-opus-4-5",
    "claude-opus-4-6",
    "claude-sonnet-4-0",
    "claude-sonnet-4-5",
    "claude-sonnet-4-6",
    "claude-haiku-4-5",
  ]);
});
//@ chunk-aepeg2w5.js:464052-464521 fingerprint (2.1.88 match: parseUserSpecifiedModel, 0.775)
/**
 * 解析用户写的模型：别名（fable/opusplan/sonnet/haiku/opus/best，可带 [1m]）展开成对应档默认模型；旧 Opus 4/4.1 在重映射开启时换成默认 Opus；其余保留并规范 [1m] 后缀。
 */
function resolveModelAliasSetting(modelInput) {
  let modelInputTrimmed = modelInput.trim();
  let normalizedModel = modelInputTrimmed.toLowerCase();
  let has1mTag = has1mSuffix_2(normalizedModel);
  let modelString = strip1mSuffix(normalizedModel).trim();
  if (isModelKeyAlias(modelString))
    switch (modelString) {
      case "fable": {
        let defaultFableModel = getDefaultFableModel();
        return identityModelId(
          defaultFableModel +
            (has1mTag && !isFirstPartyApiBackend() && !has1mSuffix_2(defaultFableModel) ? "[1m]" : ""),
        );
      }
      case "opusplan":
        return has1mTag
          ? identityModelId(append1mSuffixIfMissing(getDefaultSonnetModel()))
          : getDefaultSonnetModel();
      case "sonnet":
        return has1mTag
          ? identityModelId(append1mSuffixIfMissing(getDefaultSonnetModel()))
          : getDefaultSonnetModel();
      case "haiku":
        return has1mTag
          ? identityModelId(append1mSuffixIfMissing(getDefaultHaikuModel()))
          : getDefaultHaikuModel();
      case "opus":
        return has1mTag
          ? identityModelId(append1mSuffixIfMissing(getDefaultOpusModel()))
          : getDefaultOpusModel();
      case "best":
        return getDefaultMainLoopModelSetting_2();
      default:
    }
  if (usesFirstPartyModelIds() && isLegacyOpusFirstParty(modelString) && isLegacyModelRemapEnabled())
    return has1mTag ? identityModelId(append1mSuffixIfMissing(getDefaultOpusModel())) : getDefaultOpusModel();
  if (has1mTag) return identityModelId(modelInputTrimmed.replace(/(\[1m\])+$/i, "").trim() + "[1m]");
  return identityModelId(modelInputTrimmed);
}
//@ chunk-aepeg2w5.js:464521-464580 placement
function resolveModelAliasSpelling(model) {
  return isModelKeyAliasOrResolved(model.toLowerCase().trim()) ? parseUserSpecifiedModel(model) : model;
}
//@ chunk-aepeg2w5.js:464580-464626 placement (2.1.88 match: resolveAgentModelDisplay, 1)
/**
 * model 为 "inherit" 时返回 undefined，否则原样返回（技能/命令的模型字段）。
 */
function inlineSkillModelOverride(agent) {
  return agent === "inherit" ? undefined : agent;
}
//@ chunk-aepeg2w5.js:464626-464951 placement
function resolveSkillModelOverride(model, mainLoopModel) {
  let publicName = parseUserSpecifiedModel(model);
  if (!isExemptDefaultResolvingPick(publicName) && !isModelAllowed(publicName)) {
    logForDebugging(
      `Skill/command model "${model}" is not in the availableModels allowlist; keeping the session model`,
      {
        level: "warn",
      },
    );
    return mainLoopModel;
  }
  let mainHasNative1m =
    has1mSuffix_2(mainLoopModel) ||
    modelHasNative1MContext(mainLoopModel) ||
    antGrants1MContext(mainLoopModel);
  let mainIs1m = mainHasNative1m || isContextWindow1m(mainLoopModel);
  if (has1mSuffix_2(model) || !mainIs1m) return model;
  let resolved = parseUserSpecifiedModel(model);
  if (modelHasNative1MContext(resolved)) return resolved;
  if (isContextWindow1m(resolved) || antGrants1MContext(resolved)) return resolved;
  if (mainHasNative1m && supports1mBeta(resolved)) return model + "[1m]";
  return model;
}
//@ chunk-aepeg2w5.js:464951-465048 fingerprint (2.1.88 match: LEGACY_OPUS_FIRSTPARTY, 1)
/**
 * 旧 Opus 第一方 id（4.0/4.1 及带日期形式），用于自动重映射。
 */
var LEGACY_OPUS_FIRSTPARTY = [
  "claude-opus-4-20250514",
  "claude-opus-4-1-20250805",
  "claude-opus-4-0",
  "claude-opus-4-1",
];
//@ chunk-aepeg2w5.js:465048-465086 placement
/**
 * 是否旧 Opus 4 或 4.1 的第一方 id。
 */
function isLegacyOpusFirstParty(model) {
  return LEGACY_OPUS_FIRSTPARTY.includes(model);
}
//@ chunk-aepeg2w5.js:465086-465149 placement (2.1.88 match: isLegacyModelRemapEnabled, 1)
/**
 * 旧模型重映射是否开启（未设 CLAUDE_CODE_DISABLE_LEGACY_MODEL_REMAP）。
 */
function isLegacyModelRemapEnabled() {
  return !env.CLAUDE_CODE_DISABLE_LEGACY_MODEL_REMAP;
}
//@ chunk-aepeg2w5.js:465149-465304 placement (2.1.88 match: modelDisplayString, 0.478)
/**
 * 模型设置的显示串：null 显示 "Default (<默认模型>)"；别名显示 "alias (解析后)"。
 */
function modelDisplayString(model) {
  if (model === null) {
    if (isClaudeAISubscriber()) return `Default (${getClaudeAiUserDefaultModelDescription()})`;
    return `Default (${getDefaultMainLoopModel()})`;
  }
  let resolvedModel = parseUserSpecifiedModel(model);
  return (
    sanitizeTitle(
      strip1mTagWhereBuiltIn(model) === resolvedModel ? resolvedModel : `${model} (${resolvedModel})`,
    ) || "unknown model"
  );
}
//@ chunk-aepeg2w5.js:465304-465608 fingerprint (2.1.88 match: getMarketingNameForModel, 0.47)
/**
 * claude-3-x 系列的营销名（Claude 3.7 Sonnet 等）。
 */
var MODELS_WITH_1M_DISPLAY_SUFFIX; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var LEGACY_MARKETING_NAMES;
deferInit("chunk-aepeg2w5.js:465304", () => {
  MODELS_WITH_1M_DISPLAY_SUFFIX = new Set([
    "claude-opus-4-6",
    "claude-opus-4-7",
    "claude-opus-4-8",
    "claude-opus-5",
    "claude-opus-5-5",
    "claude-sonnet-4-0",
    "claude-sonnet-4-5",
    "claude-sonnet-4-6",
  ]);
  LEGACY_MARKETING_NAMES = new Map([
    ["claude-3-7-sonnet", "Claude 3.7 Sonnet"],
    ["claude-3-5-sonnet", "Claude 3.5 Sonnet"],
    ["claude-3-5-haiku", "Claude 3.5 Haiku"],
  ]);
});
//@ chunk-aepeg2w5.js:465608-466021 placement
function nameForUnnamedModelId(modelId) {
  if (getAPIProvider() === "foundry") return;
  let trimmed = modelId.trim();
  let lower = trimmed.toLowerCase();
  if (/\s/.test(lower)) return;
  let canonical = settingsOverrideCanonicalName(strip1mSuffix(trimmed));
  if (canonical !== undefined)
    return getCatalogDisplayName(canonical, has1mSuffix_2(strip1mTagWhereBuiltIn(trimmed))) ?? undefined;
  let candidate = lower;
  let modelId_2 = parseModelId(candidate);
  if (!modelId_2) {
    let index = lower.indexOf("claude-");
    if (index <= 0 || /[a-z0-9]/.test(lower[index - 1] ?? "")) return;
    candidate = lower.slice(index);
    modelId_2 = parseModelId(candidate);
  }
  if (
    !modelId_2 ||
    modelId_2.trailer !== undefined ||
    /-fast(?![a-z0-9])/.test(candidate.slice(candidate.lastIndexOf(modelId_2.base) + modelId_2.base.length))
  )
    return;
  return (
    getPublicModelDisplayName(has1mSuffix_2(candidate) ? candidate : strip1mSuffix(candidate)) ?? undefined
  );
}
//@ chunk-aepeg2w5.js:466021-466067 placement
function settingsOverrideCanonicalName(model) {
  return (
    findOverrideCanonicalName(getSettingsModelOverrides(), model) ??
    findOverrideCanonicalName(getPairedPolicyModelOverrides(), model)
  );
}
//@ chunk-aepeg2w5.js:466067-466272 placement
function getMarketingNameForModel(model) {
  if (getAPIProvider() === "foundry") return;
  let canonicalName = getCanonicalName(model, {
    identity: true,
  });
  let legacyName = LEGACY_MARKETING_NAMES.get(canonicalName);
  if (legacyName !== undefined) return legacyName;
  let catalogEntry = getCatalogEntry(canonicalName);
  if (!catalogEntry) return;
  return has1mSuffix(strip1mTagWhereBuiltIn(model)) && MODELS_WITH_1M_DISPLAY_SUFFIX.has(canonicalName)
    ? `${catalogEntry.display_name} (1M context)`
    : catalogEntry.display_name;
}
//@ chunk-aepeg2w5.js:466272-466355 placement
function modelSettingResolvesThroughModelStrings(userSpecifiedModelSetting) {
  let lower = stripAnyVersatileSuffix(userSpecifiedModelSetting).trim().toLowerCase();
  return isModelKeyAlias(lower) || Object.hasOwn(MODEL_KEY_BY_FIRST_PARTY_ID, lower);
}
//@ chunk-aepeg2w5.js:466355-466630 placement
function toProviderWireModelId(model) {
  let stripped = stripAnyVersatileSuffix(model);
  let lower = stripped.toLowerCase();
  if (!Object.hasOwn(MODEL_KEY_BY_FIRST_PARTY_ID, lower)) return catalogAliasFor(stripped) ?? stripped;
  let key = MODEL_KEY_BY_FIRST_PARTY_ID[lower];
  if (key === undefined) return stripped;
  let mapping = warnModelOutsideAvailable({
    id: lower,
    raw: getRawModelStrings()[key],
    overrideKey: lower,
  });
  if (mapping === undefined) return stripped;
  let apiProvider = getAPIProvider();
  if (
    mapping.overridden ||
    (apiProvider !== "foundry" && catalogEntriesByFirstPartyId[key][apiProvider] !== null)
  )
    return stripAnyVersatileSuffix(mapping.mapped);
  return stripped;
}
//@ chunk-aepeg2w5.js:466630-467071 placement
/**
 * 模型不在托管 availableModels 中时记录警告。
 */
function warnModelOutsideAvailable({ id, raw, overrideKey }) {
  if (getModelEnforcementState().state === "refused") return;
  let settings;
  try {
    settings = getSettingsForSource("policySettings");
  } catch {
    return;
  }
  let availableModels = settings?.availableModels;
  let overrides = settings?.modelOverrides ?? getPairedPolicyModelOverrides() ?? {};
  if (
    availableModels !== undefined &&
    !isModelAllowed(id, {
      allowlist: availableModels,
      overridesMap: overrides,
      envFreeAliasResolution: true,
    })
  )
    return;
  let mappedOverrides =
    availableModels === undefined ? (getInitialSettings_2().modelOverrides ?? {}) : overrides;
  let mapped =
    overrideKey !== undefined && Object.hasOwn(mappedOverrides, overrideKey)
      ? mappedOverrides[overrideKey]
      : undefined;
  if (!mapped || (availableModels === undefined && mapped === raw) || isModelDeniedByManagedFalse(mapped))
    return {
      mapped: raw,
      overridden: false,
    };
  return {
    mapped,
    overridden: true,
  };
}
//@ chunk-aepeg2w5.js:467071-467388 placement
/**
 * 取模型在目录中的别名（若可唯一确定）。
 */
function catalogAliasFor(model) {
  let entry = findEffectiveServedEntry(model);
  if (entry === undefined || entryModelKey(entry.id) !== undefined) return;
  let id = hasDescribableCatalogModel(entry.id) ? entry.id : undefined;
  if (gatewayCatalogRowId(model) !== undefined && model.toLowerCase() !== id) return;
  let providerModelId = resolveProviderModelId(entry);
  if (providerModelId === undefined || (providerModelId === entry.id && id === undefined)) return;
  let mapping = warnModelOutsideAvailable({
    id: entry.id,
    raw: gatewayModelIdFor(entry) ?? model,
    overrideKey: id,
  });
  if (mapping === undefined || mapping.mapped === entry.id || isModelDeniedByManagedFalse(mapping.mapped))
    return;
  return stripAnyVersatileSuffix(mapping.mapped);
}
//@ chunk-aepeg2w5.js:467388-467435 placement
function strip1mTag(model) {
  return model.replace(/\[1m\]/gi, "");
}
//@ chunk-aepeg2w5.js:467435-467685 placement
function getFlagContextWindow(model) {
  let canonicalName = getCanonicalName(model, {
    identity: true,
    overridesMap: {},
  });
  if (
    !isLegacy46Model(canonicalName) ||
    !isFirstPartyApiBackend() ||
    is1mContextDisabled() ||
    isLongContext1mCreditsBlocked() ||
    getSonnet46ContextWindowOverride(model) !== null
  )
    return null;
  let pin = getFeatureValue_SESSION_PINNED(TENGU_KIND_DEWDROP, {})?.[canonicalName];
  if (typeof pin !== "number" || !Number.isInteger(pin) || pin >= 1e6) return null;
  let min = Math.min(pin, servedMaxInputTokens(model, canonicalName) ?? pin);
  return min > CONTEXT_WINDOW_THRESHOLD ? min : null;
}
//@ chunk-aepeg2w5.js:470748-470799 placement
/**
 * 上下文窗口与输出 token 相关的几个阈值常量。
 */
var CONTEXT_WINDOW_THRESHOLD = 200000;
var SECONDARY_CONTEXT_WINDOW = 200000;
var MAX_CONTEXT_WINDOW_1M = 1e6;
var SMALL_FAST_MAX_OUTPUT_TOKENS = 32000;
var MAX_OUTPUT_TOKENS_LIMIT = 128000;
//@ chunk-hwmsct5x.js:200437-200502 placement (2.1.88 match: CLAUDE_4_5_OR_4_6_MODEL_IDS, 0.463)
/**
 * sonnet/opus/haiku/fable → 对应默认模型 getter 的结果。旧版名 CLAUDE_4_5_OR_4_6_MODEL_IDS 为错配。
 */
function getDefaultModelForFamily(family) {
  return {
    sonnet: getDefaultSonnetModel,
    opus: getDefaultOpusModel,
    haiku: getDefaultHaikuModel,
    fable: getDefaultFableModel,
  }[family]();
}
//@ chunk-e6aww6q8.js:1428769-1428917 fingerprint (2.1.88 match: getSmallFastModel, 1)
/**
 * 自定义模型名能否按 opus 别名对待：不含已知族名、不是已知模型或档位默认、也不是 ANTHROPIC_SMALL_FAST_MODEL。旧版名 getSmallFastModel 为错配。
 */
function isOpusAliasCandidate(model, canonicalName) {
  if (MODEL_KEY_NAMES.some((name) => canonicalName.includes(name))) return false;
  if (isRecognizedCanonical(canonicalName) || isTierDefaultModelEnv(model)) return false;
  let ANTHROPIC_SMALL_FAST_MODEL = env.ANTHROPIC_SMALL_FAST_MODEL;
  return !(ANTHROPIC_SMALL_FAST_MODEL !== undefined && sameModelSpelling(ANTHROPIC_SMALL_FAST_MODEL, model));
}
//@ chunk-e6aww6q8.js:3333467-3333681 fingerprint (2.1.88 match: getRuntimeMainLoopModel, 0.687)
/**
 * 运行时模型（含 plan 模式切换）与上次公告不同时生成模型公告附件。旧版名 getRuntimeMainLoopModel 不准确。
 */
async function getRuntimeModelSwitchAnnouncements(context, messages) {
  if (!shouldEmitEnvironmentChanges(context.options)) return [];
  let recentMessages = messagesSinceCompactBoundary(messages ?? []);
  let mode = getToolPermissionContext(context).mode;
  let modelInfo = modelInfoForModel(
    getRuntimeMainLoopModel({
      permissionMode: mode,
      mainLoopModel: getMainLoopModel_2(context),
      exceeds200kTokens: mode === "plan" && doesMostRecentAssistantMessageExceed200k(recentMessages),
    }),
  );
  let lastModelIdentity = getLastModelIdentity(recentMessages);
  return lastModelIdentity && isSameModelIdentity(lastModelIdentity, modelInfo)
    ? []
    : [await buildModelEnvInfoAttachment(modelInfo)];
}
//@ chunk-d1cgs5na.js:12054-12136 fingerprint (2.1.88 match: renderDefaultModelSetting, 1)
/**
 * 默认模型设置展开：opusplan 返回 [默认 Opus, 解析后]，否则 [解析后]。
 */
function renderDefaultModelSetting(setting) {
  return strip1mSuffix(setting.toLowerCase().trim()) === "opusplan"
    ? [getDefaultOpusModel(), parseUserSpecifiedModel(setting)]
    : [parseUserSpecifiedModel(setting)];
}
//@ chunk-095ptjmr.js:6087-6140 fingerprint (2.1.88 match: resolveSkillModelOverride, 1)
/**
 * 已有 [1m] 原样返回，否则追加 [1m]。旧版名 resolveSkillModelOverride 为错配。
 */
function ensure1mSuffix(model) {
  return /\[1m\]$/i.test(model) ? model : `${model}[1m]`;
}
export {
  strip1mTagWhereBuiltIn,
  isPinnedFableModel,
  getDefaultOpusModel,
  getMainLoopModel,
  modelDisplayString,
  ensure1mSuffix,
  resolveModelAliasSpelling,
  toProviderWireModelId,
  isOpus5FamilyModel,
  strip1mTag,
  modelSettingResolvesThroughModelStrings,
  renderDefaultModelSetting,
  isOpus55FamilyModel,
  isSonnet55FamilyModel,
  resolveSkillModelOverride,
  getDefaultSonnetModel,
  DEFAULT_3P_OPUS_KEY,
  DEFAULT_3P_SONNET_KEY,
  DEFAULT_3P_HAIKU_KEY,
  isFableModelValue,
  isMythosModelValue,
  SECONDARY_CONTEXT_WINDOW,
  isFableFamilyOrPinnedModel,
  inlineSkillModelOverride,
  isUnservedFamilySpelling,
  isTierDefaultModelEnv,
  CONTEXT_WINDOW_THRESHOLD,
  isUnservedModelSpelling,
  isAntInternalFastModelId,
  isOpusAliasCandidate,
  getMarketingNameForModel,
  DEFAULT_MANTLE_OPUS_KEY,
  DEFAULT_VERTEX_OPUS_KEY,
  isFableAvailable,
  isMythosAvailable,
  isServedExpandedSpelling,
  isLegacyOpusFirstParty,
  isLegacyModelRemapEnabled,
  isModelOverrideTarget,
  normalizeModelSpelling,
  isKnownCustomModel,
  LEGACY_SUBAGENT_MODEL_IDS,
  tierOverrideModel,
  getDefaultOpusBuiltin,
  nameForUnnamedModelId,
  resolveModelAliasSetting,
  isMythosModelValue_2,
  resolveDefaultOpusModel,
  getDefaultModelForFamily,
  getDefaultFableModel,
  displayNameForModel,
  getDefaultFableBuiltin,
  FAMILY_AVAILABILITY,
  getBestAvailableAlias,
  MAX_CONTEXT_WINDOW_1M,
  getFlagContextWindow,
  SMALL_FAST_MAX_OUTPUT_TOKENS,
  MAX_OUTPUT_TOKENS_LIMIT,
  getRuntimeModelSwitchAnnouncements,
  DEFAULT_BEDROCK_OPUS_KEY,
  documentTierAliasTarget,
  DEFAULT_3P_FABLE_KEY,
};
