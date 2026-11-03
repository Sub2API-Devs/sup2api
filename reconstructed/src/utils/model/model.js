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

//@ chunk-aepeg2w5.js:420461-420644 fingerprint = getDefaultHaikuModel (0.317)
/**
 * 模型是否等于某档 ANTHROPIC_DEFAULT_{FABLE,OPUS,SONNET,HAIKU}_MODEL。旧版名 getDefaultHaikuModel 为错配。
 */
function isTierDefaultModelEnv(e) {
  return [
    env.ANTHROPIC_DEFAULT_FABLE_MODEL,
    env.ANTHROPIC_DEFAULT_OPUS_MODEL,
    env.ANTHROPIC_DEFAULT_SONNET_MODEL,
    env.ANTHROPIC_DEFAULT_HAIKU_MODEL,
  ].some((n) => n !== undefined && sameModelSpelling(n, e));
}
//@ chunk-aepeg2w5.js:429528-429584 placement
/**
 * 模型写法规范化：trim、小写并去掉修饰后缀。
 */
function normalizeModelSpelling(e) {
  return strip1mSuffix(e.trim().toLowerCase()).trim();
}
//@ chunk-aepeg2w5.js:429584-429904 layout
/**
 * 判断（规范化后的）模型名是否为已知的自定义模型：ANTHROPIC_CUSTOM_MODEL_OPTION、精选选择器选项、模型覆盖目标、附加模型选项缓存或已验证过的模型。
 */
function isKnownCustomModel(e) {
  let ANTHROPIC_CUSTOM_MODEL_OPTION = env.ANTHROPIC_CUSTOM_MODEL_OPTION;
  if (
    ANTHROPIC_CUSTOM_MODEL_OPTION !== undefined &&
    normalizeModelSpelling(ANTHROPIC_CUSTOM_MODEL_OPTION) === e
  )
    return true;
  if (
    getCuratedModelPicker()?.picker.options.some((option) => normalizeModelSpelling(option.model) === e) ??
    false
  )
    return true;
  if (isModelOverrideTarget(e)) return true;
  if (
    getAdditionalModelOptionsCache().some(
      (r) => typeof r.value === "string" && normalizeModelSpelling(r.value) === e,
    )
  )
    return true;
  for (let validatedModel of getProviderState().providerCache.validatedModels)
    if (normalizeModelSpelling(validatedModel) === e) return true;
  return false;
}
//@ chunk-aepeg2w5.js:429904-430061 placement
/**
 * 判断模型名是否为某个模型覆盖设置的目标值。
 */
function isModelOverrideTarget(e) {
  let n = normalizeModelSpelling(e);
  if (n === "") return false;
  for (let r of [getSettingsModelOverrides(), getPairedPolicyModelOverrides()])
    for (let s of Object.values(r ?? {}))
      if (typeof s === "string" && normalizeModelSpelling(s) === n) return true;
  return false;
}
//@ chunk-aepeg2w5.js:430061-430111 placement
function isUnservedFamilySpelling(e) {
  return noCatalogAliasTarget(e)?.kind === "unresolved";
}
//@ chunk-aepeg2w5.js:430111-430167 placement
function isUnservedModelSpelling(e, n) {
  return isUnservedFamilySpelling(e) || (n === "persisted" && neverUnavailable(e));
}
//@ chunk-aepeg2w5.js:430167-430205 placement
function isServedExpandedSpelling(e) {
  return noCatalogBehavesAs(e) !== undefined;
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
    builtinDefault: (e) => getDefaultFableBuiltin(e),
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
  let e = FAMILY_AVAILABILITY[getBestAvailableAlias()];
  if (e !== undefined) {
    let n = e.defaultModel();
    let providerState = getProviderState();
    if (providerState.resolvingBestModel) return n;
    providerState.resolvingBestModel = true;
    try {
      if (isModelAllowed(n)) return n;
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
function isFableModelValue(e) {
  return e.includes("claude-fable-");
}
//@ chunk-aepeg2w5.js:430813-430865 placement
function isMythosModelValue(e) {
  return e.includes("claude-mythos-");
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
    (n) => n.disabled !== true && typeof n.value === "string" && isFableModelValue(n.value),
  );
}
//@ chunk-aepeg2w5.js:431388-431608 placement
function isDefaultFableOptionDisabled() {
  if (getAPIProvider() !== "firstParty" || !isFirstPartyAnthropicBaseUrl()) return false;
  let filtered = getAdditionalModelOptionsCache().filter(
    (r) => typeof r.value === "string" && isFableModelValue(r.value),
  );
  let canonicalName = getCanonicalName(getDefaultFableModel(), {
    identity: true,
  });
  return allMatchAfterFilter(
    filtered,
    (r) =>
      getCanonicalName(String(r.value), {
        identity: true,
      }) === canonicalName,
    (r) => r.disabled === true,
  );
}
//@ chunk-aepeg2w5.js:431608-431692 placement
function allMatchAfterFilter(e, n, r) {
  let filtered = e.filter(n);
  let h = filtered.length > 0 ? filtered : e;
  return h.length > 0 && h.every(r);
}
//@ chunk-aepeg2w5.js:431692-431834 placement
function isServedCatalogModelInactive(e, n) {
  if (activeServedCatalog() === null) return false;
  let filtered = activeCatalogModels().filter((s) => e(s.id));
  return allMatchAfterFilter(
    filtered,
    (s) =>
      n !== undefined &&
      getCanonicalName(s.id, {
        identity: true,
      }) === n,
    (s) => !isActiveCatalogModel(s),
  );
}
//@ chunk-aepeg2w5.js:431834-432395 placement
function isMythosAvailable(e) {
  if (getAPIProvider() !== "firstParty" || !isFirstPartyAnthropicBaseUrl()) return false;
  let n = (canonicalName) => (isNonCustomMythosModel(canonicalName) ? canonicalName : undefined);
  let r =
    e === undefined
      ? undefined
      : n(
          getCanonicalName(e, {
            identity: true,
          }),
        );
  let s = (y) => {
    let filtered = y.filter((w) => w.canonical === r);
    return (filtered.length > 0 ? filtered : y).some((w) => w.enabled);
  };
  let h = () => {
    let y = activeServedCatalog();
    return s(
      activeCatalogModels().flatMap((S) => {
        let w = n(getCanonicalName(S.id));
        return w && y !== null
          ? [
              {
                canonical: w,
                enabled: isCatalogRowSelectable(y, S),
              },
            ]
          : [];
      }),
    );
  };
  if (isServedCatalogActive()) return h();
  if (isEffectiveCatalogActive()) {
    if (isServedCatalogModelInactive(isMythosModelValue, r)) return false;
    if (!hasExtraModelOptions()) return h();
  }
  return s(
    getAdditionalModelOptionsCache().flatMap((y) => {
      let S =
        typeof y.value === "string"
          ? n(
              getCanonicalName(y.value, {
                identity: true,
              }),
            )
          : undefined;
      return S
        ? [
            {
              canonical: S,
              enabled: y.disabled !== true,
            },
          ]
        : [];
    }),
  );
}
//@ chunk-aepeg2w5.js:432395-432483 placement
function catalogHasSelectableMatching(isFableModelValue) {
  let n = activeServedCatalog();
  if (n === null) return false;
  return activeCatalogModels().some((r) => isCatalogRowSelectable(n, r) && isFableModelValue(r.id));
}
//@ chunk-aepeg2w5.js:432483-432573 placement
function isPinnedFableModel(e) {
  let ANTHROPIC_DEFAULT_FABLE_MODEL = env.ANTHROPIC_DEFAULT_FABLE_MODEL;
  if (!ANTHROPIC_DEFAULT_FABLE_MODEL) return false;
  return strip1mSuffix(e) === strip1mSuffix(ANTHROPIC_DEFAULT_FABLE_MODEL);
}
//@ chunk-aepeg2w5.js:432573-432673 placement
function isFableFamilyOrPinnedModel(e, n) {
  return (
    getCanonicalName(
      e,
      n?.identity
        ? {
            identity: true,
          }
        : undefined,
    ).startsWith("claude-fable-") || isPinnedFableModel(e)
  );
}
//@ chunk-aepeg2w5.js:432673-432730 placement
/**
 * 判断模型值是否属于 mythos 系列。
 */
function isMythosModelValue_2(e) {
  return getCanonicalName(e).startsWith("claude-mythos-");
}
//@ chunk-aepeg2w5.js:432730-432781 placement
function isOpus5FamilyModel(e) {
  return strip1mSuffix(getCanonicalName(e)) === "claude-opus-5";
}
//@ chunk-aepeg2w5.js:432781-432834 placement
function isOpus55FamilyModel(e) {
  return strip1mSuffix(getCanonicalName(e)) === "claude-opus-5-5";
}
//@ chunk-aepeg2w5.js:432834-432889 placement
function isSonnet55FamilyModel(mainLoopModel) {
  return strip1mSuffix(getCanonicalName(mainLoopModel)) === "claude-sonnet-5-5";
}
//@ chunk-aepeg2w5.js:432889-432958 placement
function isLegacy46Model(canonicalName) {
  return canonicalName === "claude-opus-4-6" || canonicalName === "claude-sonnet-4-6";
}
//@ chunk-aepeg2w5.js:432958-432983 placement
function isAntInternalFastModelId(e) {
  return false;
}
//@ chunk-aepeg2w5.js:432983-432998 layout
/**
 * catalog 键 "opus5"。
 */
var OPUS5_KEY = "opus5";
//@ chunk-aepeg2w5.js:432998-433227 fingerprint = getDefaultOpusModel (0.711)
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
          .map((h) => modelStrings[h])
          .find((h) => isModelAllowed(h)) ?? modelStrings[OPUS5_KEY];
    }
  }
  return inherit1mSuffix(identityModelId(ANTHROPIC_DEFAULT_OPUS_MODEL), currentModel);
}
//@ chunk-aepeg2w5.js:436867-437117 placement = aliasMatchesParentTier (0.852)
/**
 * 档位别名（opus/sonnet/haiku/fable）在 settings 档位覆盖里配置的模型：映射到 catalog 键则取模型字符串表中的值，否则解析成提供商 id。
 */
function getTierOverrideModel(alias, parentModel) {
  if (alias !== "opus" && alias !== "sonnet" && alias !== "haiku" && alias !== "fable") return;
  let canonical = ultraplanModelOrUndefined(alias);
  if (canonical === undefined) return;
  let lower = canonical.toLowerCase();
  let h = Object.hasOwn(MODEL_KEY_BY_FIRST_PARTY_ID, lower) ? MODEL_KEY_BY_FIRST_PARTY_ID[lower] : undefined;
  if (h !== undefined) return parentModel[h];
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
function documentTierAliasTarget(e) {
  if (activeServedCatalog() === null) return;
  let n = ultraplanModelOrUndefined(e);
  if (n === undefined) return;
  let lower = n.toLowerCase();
  let s = Object.hasOwn(MODEL_KEY_BY_FIRST_PARTY_ID, lower) ? MODEL_KEY_BY_FIRST_PARTY_ID[lower] : undefined;
  if (s !== undefined)
    return {
      key: s,
      name: displayNameForModel(n, s),
    };
  let h = findServedModel(n) ?? {
    id: n,
  };
  let y = entryModelKey(h.id);
  if (y !== undefined)
    return {
      key: y,
      name: displayNameForModel(n, y),
    };
  let providerModelId = resolveProviderModelId(h);
  return providerModelId === undefined
    ? undefined
    : {
        key: undefined,
        modelId: providerModelId,
        ...(hasDescribableCatalogModel(h.id) && {
          overrideKey: h.id,
        }),
        name: displayNameForModel(n, undefined),
      };
}
//@ chunk-aepeg2w5.js:437503-437597 placement
/**
 * 取模型的展示名（营销名或目录名，兜底 "that model"）。
 */
function displayNameForModel(e, n) {
  return (
    getMarketingNameForModel(n !== undefined ? catalogEntriesByFirstPartyId[n].firstParty : e) ??
    (sanitizeTitle(findServedModel(e)?.name ?? e) || "that model")
  );
}
//@ chunk-aepeg2w5.js:437597-437696 placement
function getDefaultFableModel() {
  let e = env.ANTHROPIC_DEFAULT_FABLE_MODEL ?? tierOverrideModel("fable");
  return identityModelId(e !== undefined ? strip1mWhenNative(e) : getDefaultFableBuiltin());
}
//@ chunk-aepeg2w5.js:437696-437765 placement
function strip1mTagWhereBuiltIn(e) {
  let n = strip1mTag(e);
  return n !== e &&
    modelHasNative1MContext(n, {
      byItsOwnName: true,
    })
    ? n
    : e;
}
//@ chunk-aepeg2w5.js:437765-437858 placement
function strip1mWhenNative(e) {
  let n = strip1mTag(e);
  if (n === e) return e;
  return modelHasNative1MContext(n, {
    byItsOwnName: true,
  }) ||
    (isFirstPartyApiBackend() && neverHasNative1m(n))
    ? n
    : e;
}
//@ chunk-aepeg2w5.js:437858-437882 placement
function neverHasNative1m(e) {
  return false;
}
//@ chunk-aepeg2w5.js:437882-437946 placement
/**
 * 取默认 Fable 模型（目录档位或内置默认，并处理 1M 后缀）。
 */
function getDefaultFableBuiltin(e = getModelStrings()) {
  let n = catalogFamilyDefaultKey("fable", e) ?? e.fable51;
  return strip1mWhenNative(n);
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
//@ chunk-aepeg2w5.js:438102-438212 placement = getDefaultSonnetModel (0.276)
/**
 * 默认 Sonnet：ANTHROPIC_DEFAULT_SONNET_MODEL，否则 settings 档位覆盖，否则 catalog sonnet 档（第一方 claude-sonnet-5-5）。
 */
function getDefaultSonnetModel() {
  let ANTHROPIC_DEFAULT_SONNET_MODEL = env.ANTHROPIC_DEFAULT_SONNET_MODEL;
  if (ANTHROPIC_DEFAULT_SONNET_MODEL !== undefined)
    return identityModelId(strip1mTagWhereBuiltIn(ANTHROPIC_DEFAULT_SONNET_MODEL));
  return tierOverrideModel("sonnet") ?? getDefaultSonnetBuiltin();
}
//@ chunk-aepeg2w5.js:459417-459696 fingerprint = firstPartyNameToCanonical (0.849)
/**
 * 一组旧模型规范名；getAgentToolCallFormatVersion 一类判断（命中返回 4，否则 3）用。旧版名 firstPartyNameToCanonical 为错配。
 */
var LEGACY_SUBAGENT_MODEL_IDS = new Set([
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
//@ chunk-aepeg2w5.js:464052-464521 fingerprint = parseUserSpecifiedModel (0.775)
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
function resolveModelAliasSpelling(e) {
  return isModelKeyAliasOrResolved(e.toLowerCase().trim()) ? parseUserSpecifiedModel(e) : e;
}
//@ chunk-aepeg2w5.js:464580-464626 placement = resolveAgentModelDisplay (1)
/**
 * model 为 "inherit" 时返回 undefined，否则原样返回（技能/命令的模型字段）。
 */
function inlineSkillModelOverride(agent) {
  return agent === "inherit" ? undefined : agent;
}
//@ chunk-aepeg2w5.js:464626-464951 placement
function resolveSkillModelOverride(e, mainLoopModel) {
  let publicName = parseUserSpecifiedModel(e);
  if (!isExemptDefaultResolvingPick(publicName) && !isModelAllowed(publicName)) {
    logForDebugging(
      `Skill/command model "${e}" is not in the availableModels allowlist; keeping the session model`,
      {
        level: "warn",
      },
    );
    return mainLoopModel;
  }
  let s =
    has1mSuffix_2(mainLoopModel) ||
    modelHasNative1MContext(mainLoopModel) ||
    antGrants1MContext(mainLoopModel);
  let h = s || isContextWindow1m(mainLoopModel);
  if (has1mSuffix_2(e) || !h) return e;
  let resolved = parseUserSpecifiedModel(e);
  if (modelHasNative1MContext(resolved)) return resolved;
  if (isContextWindow1m(resolved) || antGrants1MContext(resolved)) return resolved;
  if (s && supports1mBeta(resolved)) return e + "[1m]";
  return e;
}
//@ chunk-aepeg2w5.js:464951-465048 fingerprint = LEGACY_OPUS_FIRSTPARTY (1)
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
//@ chunk-aepeg2w5.js:465086-465149 placement = isLegacyModelRemapEnabled (1)
/**
 * 旧模型重映射是否开启（未设 CLAUDE_CODE_DISABLE_LEGACY_MODEL_REMAP）。
 */
function isLegacyModelRemapEnabled() {
  return !env.CLAUDE_CODE_DISABLE_LEGACY_MODEL_REMAP;
}
//@ chunk-aepeg2w5.js:465149-465304 placement = modelDisplayString (0.478)
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
//@ chunk-aepeg2w5.js:465304-465608 fingerprint = getMarketingNameForModel (0.47)
/**
 * claude-3-x 系列的营销名（Claude 3.7 Sonnet 等）。
 */
var MODELS_WITH_1M_DISPLAY_SUFFIX = new Set([
  "claude-opus-4-6",
  "claude-opus-4-7",
  "claude-opus-4-8",
  "claude-opus-5",
  "claude-opus-5-5",
  "claude-sonnet-4-0",
  "claude-sonnet-4-5",
  "claude-sonnet-4-6",
]);
var LEGACY_MARKETING_NAMES = new Map([
  ["claude-3-7-sonnet", "Claude 3.7 Sonnet"],
  ["claude-3-5-sonnet", "Claude 3.5 Sonnet"],
  ["claude-3-5-haiku", "Claude 3.5 Haiku"],
]);
//@ chunk-aepeg2w5.js:465608-466021 placement
function nameForUnnamedModelId(e) {
  if (getAPIProvider() === "foundry") return;
  let trimmed = e.trim();
  let lower = trimmed.toLowerCase();
  if (/\s/.test(lower)) return;
  let s = settingsOverrideCanonicalName(strip1mSuffix(trimmed));
  if (s !== undefined)
    return getCatalogDisplayName(s, has1mSuffix_2(strip1mTagWhereBuiltIn(trimmed))) ?? undefined;
  let h = lower;
  let modelId = parseModelId(h);
  if (!modelId) {
    let index = lower.indexOf("claude-");
    if (index <= 0 || /[a-z0-9]/.test(lower[index - 1] ?? "")) return;
    h = lower.slice(index);
    modelId = parseModelId(h);
  }
  if (
    !modelId ||
    modelId.trailer !== undefined ||
    /-fast(?![a-z0-9])/.test(h.slice(h.lastIndexOf(modelId.base) + modelId.base.length))
  )
    return;
  return getPublicModelDisplayName(has1mSuffix_2(h) ? h : strip1mSuffix(h)) ?? undefined;
}
//@ chunk-aepeg2w5.js:466021-466067 placement
function settingsOverrideCanonicalName(e) {
  return (
    findOverrideCanonicalName(getSettingsModelOverrides(), e) ??
    findOverrideCanonicalName(getPairedPolicyModelOverrides(), e)
  );
}
//@ chunk-aepeg2w5.js:466067-466272 placement
function getMarketingNameForModel(e) {
  if (getAPIProvider() === "foundry") return;
  let canonicalName = getCanonicalName(e, {
    identity: true,
  });
  let r = LEGACY_MARKETING_NAMES.get(canonicalName);
  if (r !== undefined) return r;
  let catalogEntry = getCatalogEntry(canonicalName);
  if (!catalogEntry) return;
  return has1mSuffix(strip1mTagWhereBuiltIn(e)) && MODELS_WITH_1M_DISPLAY_SUFFIX.has(canonicalName)
    ? `${catalogEntry.display_name} (1M context)`
    : catalogEntry.display_name;
}
//@ chunk-aepeg2w5.js:466272-466355 placement
function modelSettingResolvesThroughModelStrings(userSpecifiedModelSetting) {
  let lower = stripAnyVersatileSuffix(userSpecifiedModelSetting).trim().toLowerCase();
  return isModelKeyAlias(lower) || Object.hasOwn(MODEL_KEY_BY_FIRST_PARTY_ID, lower);
}
//@ chunk-aepeg2w5.js:466355-466630 placement
function toProviderWireModelId(e) {
  let n = stripAnyVersatileSuffix(e);
  let lower = n.toLowerCase();
  if (!Object.hasOwn(MODEL_KEY_BY_FIRST_PARTY_ID, lower)) return catalogAliasFor(n) ?? n;
  let s = MODEL_KEY_BY_FIRST_PARTY_ID[lower];
  if (s === undefined) return n;
  let h = warnModelOutsideAvailable({
    id: lower,
    raw: getRawModelStrings()[s],
    overrideKey: lower,
  });
  if (h === undefined) return n;
  let apiProvider = getAPIProvider();
  if (h.overridden || (apiProvider !== "foundry" && catalogEntriesByFirstPartyId[s][apiProvider] !== null))
    return stripAnyVersatileSuffix(h.mapped);
  return n;
}
//@ chunk-aepeg2w5.js:466630-467071 placement
/**
 * 模型不在托管 availableModels 中时记录警告。
 */
function warnModelOutsideAvailable({ id, raw, overrideKey }) {
  if (getModelEnforcementState().state === "refused") return;
  let h;
  try {
    h = getSettingsForSource("policySettings");
  } catch {
    return;
  }
  let availableModels = h?.availableModels;
  let S = h?.modelOverrides ?? getPairedPolicyModelOverrides() ?? {};
  if (
    availableModels !== undefined &&
    !isModelAllowed(id, {
      allowlist: availableModels,
      overridesMap: S,
      envFreeAliasResolution: true,
    })
  )
    return;
  let w = availableModels === undefined ? (getInitialSettings_2().modelOverrides ?? {}) : S;
  let R = overrideKey !== undefined && Object.hasOwn(w, overrideKey) ? w[overrideKey] : undefined;
  if (!R || (availableModels === undefined && R === raw) || isModelDeniedByManagedFalse(R))
    return {
      mapped: raw,
      overridden: false,
    };
  return {
    mapped: R,
    overridden: true,
  };
}
//@ chunk-aepeg2w5.js:467071-467388 placement
/**
 * 取模型在目录中的别名（若可唯一确定）。
 */
function catalogAliasFor(e) {
  let effectiveServedEntry = findEffectiveServedEntry(e);
  if (effectiveServedEntry === undefined || entryModelKey(effectiveServedEntry.id) !== undefined) return;
  let id = hasDescribableCatalogModel(effectiveServedEntry.id) ? effectiveServedEntry.id : undefined;
  if (gatewayCatalogRowId(e) !== undefined && e.toLowerCase() !== id) return;
  let providerModelId = resolveProviderModelId(effectiveServedEntry);
  if (providerModelId === undefined || (providerModelId === effectiveServedEntry.id && id === undefined))
    return;
  let h = warnModelOutsideAvailable({
    id: effectiveServedEntry.id,
    raw: gatewayModelIdFor(effectiveServedEntry) ?? e,
    overrideKey: id,
  });
  if (h === undefined || h.mapped === effectiveServedEntry.id || isModelDeniedByManagedFalse(h.mapped))
    return;
  return stripAnyVersatileSuffix(h.mapped);
}
//@ chunk-aepeg2w5.js:467388-467435 placement
function strip1mTag(model) {
  return model.replace(/\[1m\]/gi, "");
}
//@ chunk-aepeg2w5.js:467435-467685 placement
function getFlagContextWindow(e) {
  let canonicalName = getCanonicalName(e, {
    identity: true,
    overridesMap: {},
  });
  if (
    !isLegacy46Model(canonicalName) ||
    !isFirstPartyApiBackend() ||
    is1mContextDisabled() ||
    isLongContext1mCreditsBlocked() ||
    getSonnet46ContextWindowOverride(e) !== null
  )
    return null;
  let r = getFeatureValue_SESSION_PINNED(TENGU_KIND_DEWDROP, {})?.[canonicalName];
  if (typeof r !== "number" || !Number.isInteger(r) || r >= 1e6) return null;
  let min = Math.min(r, servedMaxInputTokens(e, canonicalName) ?? r);
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
//@ chunk-e6aww6q8.js:1428769-1428917 fingerprint = getSmallFastModel (1)
/**
 * 自定义模型名能否按 opus 别名对待：不含已知族名、不是已知模型或档位默认、也不是 ANTHROPIC_SMALL_FAST_MODEL。旧版名 getSmallFastModel 为错配。
 */
function isOpusAliasCandidate(e, canonicalName) {
  if (MODEL_KEY_NAMES.some((s) => canonicalName.includes(s))) return false;
  if (isRecognizedCanonical(canonicalName) || isTierDefaultModelEnv(e)) return false;
  let ANTHROPIC_SMALL_FAST_MODEL = env.ANTHROPIC_SMALL_FAST_MODEL;
  return !(ANTHROPIC_SMALL_FAST_MODEL !== undefined && sameModelSpelling(ANTHROPIC_SMALL_FAST_MODEL, e));
}
//@ chunk-e6aww6q8.js:3333467-3333681 fingerprint = getRuntimeMainLoopModel (0.687)
/**
 * 运行时模型（含 plan 模式切换）与上次公告不同时生成模型公告附件。旧版名 getRuntimeMainLoopModel 不准确。
 */
async function getRuntimeModelSwitchAnnouncements(e, n) {
  if (!shouldEmitEnvironmentChanges(e.options)) return [];
  let r = messagesSinceCompactBoundary(n ?? []);
  let mode = getToolPermissionContext(e).mode;
  let h = modelInfoForModel(
    getRuntimeMainLoopModel({
      permissionMode: mode,
      mainLoopModel: getMainLoopModel_2(e),
      exceeds200kTokens: mode === "plan" && doesMostRecentAssistantMessageExceed200k(r),
    }),
  );
  let lastModelIdentity = getLastModelIdentity(r);
  return lastModelIdentity && isSameModelIdentity(lastModelIdentity, h)
    ? []
    : [await buildModelEnvInfoAttachment(h)];
}
//@ chunk-095ptjmr.js:6087-6140 fingerprint = resolveSkillModelOverride (1)
/**
 * 已有 [1m] 原样返回，否则追加 [1m]。旧版名 resolveSkillModelOverride 为错配。
 */
function ensure1mSuffix(f) {
  return /\[1m\]$/i.test(f) ? f : `${f}[1m]`;
}
//@ chunk-d1cgs5na.js:12054-12136 fingerprint = renderDefaultModelSetting (1)
/**
 * 默认模型设置展开：opusplan 返回 [默认 Opus, 解析后]，否则 [解析后]。
 */
function renderDefaultModelSetting(setting) {
  return strip1mSuffix(setting.toLowerCase().trim()) === "opusplan"
    ? [getDefaultOpusModel(), parseUserSpecifiedModel(setting)]
    : [parseUserSpecifiedModel(setting)];
}
//@ chunk-hwmsct5x.js:200437-200502 placement = CLAUDE_4_5_OR_4_6_MODEL_IDS (0.463)
/**
 * sonnet/opus/haiku/fable → 对应默认模型 getter 的结果。旧版名 CLAUDE_4_5_OR_4_6_MODEL_IDS 为错配。
 */
function getDefaultModelForFamily(e) {
  return {
    sonnet: getDefaultSonnetModel,
    opus: getDefaultOpusModel,
    haiku: getDefaultHaikuModel,
    fable: getDefaultFableModel,
  }[e]();
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
