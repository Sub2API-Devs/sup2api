/**
 * utils/model/modelOptions.ts
 *
 * /model 选择器选项：Default（推荐）、各族（Fable/Opus/Sonnet/Haiku）与 1M 变体、Opus Plan、自定义模型（ANTHROPIC_CUSTOM_MODEL_OPTION、ANTHROPIC_DEFAULT_*_MODEL），按订阅类型/提供商/白名单组合与过滤。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/model/modelOptions.ts
 * pieces: chunk-aepeg2w5.js (1), chunk-d1cgs5na.js (1), chunk-hwmsct5x.js (81)
 * attribution: fingerprint 17, placement 48, layout 13, callgraph-fingerprint 1, callgraph-witnessed 3, affinity 1
 */
import {
  defaultModelAttributionSuffix,
  resolveDefaultMainLoopModelSetting,
  getDefaultHaikuModel,
  getDefaultMainLoopModelSetting,
  isModeDependentModelSetting,
} from "./planModeModel.js";
import { isDefaultModelEnforced, getDefaultMainLoopModel } from "./modelFallback.js";
import { isClaudeAISubscriber, getSubscriptionType, getAdditionalModelOptionsCache } from "../auth.js";
import {
  getClaudeAiUserDefaultModelDescription,
  parseUserSpecifiedModel,
  renderDefaultModelSetting,
  getModelPricingSuffix,
  renderModelName,
  getPublicModelDisplayName,
  opus1mMergeTagsDefaultOpus,
  isOpusDefaultSubscriber,
  isOpus1mMergeEnabled,
  maskModelCodename,
  getCuratedModelPicker,
  opus1mMergeAddsTagTo,
} from "./modelDisplay.js";
import {
  usesFirstPartyModelIds,
  isClaudePlatformProvider,
  isFirstPartyAnthropicBaseUrl,
  getAPIProvider,
  isActiveCatalogModel,
  isFirstPartyApiBackend,
} from "./providers.js";
import { isFastModeOnForModel, supportsFastMode } from "../fastMode.js";
import {
  isPublishedCatalogInUse,
  withCatalogSuppressed,
  activeServedCatalog,
  findServedModel,
  findActiveServedByIdentity,
  servedCatalogSource,
  isServedCatalogActive,
  isPublishedCatalogActive,
  entryModelKey,
} from "./modelCatalog/servedCatalog.js";
import { modelHasNative1MContext, has1mSuffix_2, isLegacyNo1mModel } from "./contextWindow1m.js";
import {
  getDefaultOpusModel,
  getDefaultSonnetModel,
  getDefaultModelForFamily,
  nameForUnnamedModelId,
  getMarketingNameForModel,
  getDefaultFableModel,
  isFableAvailable,
  isFableModelValue,
} from "./model.js";
import {
  getModelCatalog_2,
  getCatalogEntry,
  catalogEntriesByFirstPartyId,
  getModelCatalog,
} from "./modelCatalog.js";
import { LEGACY_MODEL_IDS_2, stripAnyVersatileSuffix, strip1mSuffix, isBaseModelKey } from "./modelIds.js";
import { MODEL_KEY_BY_FIRST_PARTY_ID, CLAUDE_FABLE_5_CONFIG, CLAUDE_FABLE_5_1_CONFIG } from "./configs.js";
import { getCanonicalName, strippedCanonicalName } from "./canonicalModelName.js";
import { env } from "../env.js";
import {
  SONNET_SLOGAN,
  OPUS_SLOGAN,
  FABLE_SLOGAN,
  HAIKU_SLOGAN,
  buildCatalogRows,
  pickerHintFromOverride,
} from "./modelErrorOverrides.js";
import { getModelStrings, isModelAvailableOnProvider, resolveProviderModelId } from "./modelStrings.js";
import {
  usesPayAsYouGo,
  isUsageCreditsModelBilled,
  saffronPickerDimOn,
  isConsumerPlan,
  isExtraUsageOrgDisabled,
  usageCreditsBillingState,
} from "../planTiers.js";
import { findModelConfigById } from "./providerCaches.js";
import {
  anyModelDescribed,
  isRowNotOnProvider,
  activeCatalogRowKnown,
  getUnsupportedModelMessage,
} from "./modelCatalog/catalogCapabilities.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../../services/analytics/growthbook.js";
import {
  shouldProbeThirdPartyDefaults,
  shouldProbeThirdPartyDefaultsAlt,
} from "./thirdPartyModelDefaults.js";
import {
  isModelAllowed,
  isModelDenied,
  isModelDeniedByManagedSettings,
  newestAllowedInFamily,
  isModelAllowlistInactive,
  getModelEntitlementDenySet,
} from "./modelAllowlist.js";
import { isSanitizedModelOption, getGatewayModelOptions } from "../../services/gateway/gatewayDiscovery.js";
import { count } from "../collections.js";
import { logFeatureSad, logFeatureOk, logFeatureBad } from "../../services/analytics/featureTelemetry.js";
import { logForDebugging } from "../debug.js";
import { normalizeModelId } from "./modelCatalog/catalogEntries.js";
import { markdownSafeText, sanitizeTitle } from "../resultError.js";
import { getModelUnavailabilityReason, catalogFamilyDefaultKey } from "./classifierModel.js";
import { getSettings_DEPRECATED } from "../settings/settings.js";
import { isModelRemappedOrRetired } from "./deprecation.js";
import { capitalize } from "../stringUtils.js";
import { getUserSpecifiedModelSetting } from "./smallFastModel.js";
import { getInitialMainLoopModel } from "../../bootstrap/state.js";
import { eligible1mSuffixTarget } from "./defaultModel.js";

//@ chunk-hwmsct5x.js:199615-199672 placement
/**
 * 默认模型说明里的来源后缀（托管 enforced 等）。
 */
function getDefaultAttributionSuffix(attribution) {
  return defaultModelAttributionSuffix(
    attribution !== "env" && isDefaultModelEnforced() ? "enforced" : attribution,
  );
}
//@ chunk-hwmsct5x.js:199672-200008 fingerprint = getDefaultOptionForUser (0.434)
/**
 * Default 选项：订阅用户 "Default (recommended)" 描述当前默认；否则 "Default"/"(recommended)" 加 "Use the default model (currently …)" 与来源后缀。
 */
function getDefaultOptionForUser(fastMode) {
  if (isClaudeAISubscriber())
    return {
      value: null,
      label: "Default (recommended)",
      description: getClaudeAiUserDefaultModelDescription(fastMode),
    };
  let { setting, attribution } = resolveDefaultMainLoopModelSetting();
  let s = !usesFirstPartyModelIds();
  let h = isFastModeOnForModel(fastMode, setting) && supportsFastMode(setting);
  let is3P =
    attribution === "tier" || (attribution === "served" && isPublishedCatalogInUse())
      ? getModelPriceSuffix(h ? setting : parseUserSpecifiedModel(setting), h)
      : "";
  return {
    value: null,
    label: s ? "Default" : "Default (recommended)",
    description: `Use the default model (currently ${renderDefaultModelSetting(setting)})${is3P}${getDefaultAttributionSuffix(attribution)}`,
  };
}
//@ chunk-hwmsct5x.js:200008-200047 placement
/**
 * 非第一方类、anthropicAws/GoogleCloud 或非直连 api.anthropic.com 时允许 ANTHROPIC_DEFAULT_*_MODEL 自定义行。
 */
function allowsCustomTierOptions() {
  return !usesFirstPartyModelIds() || isClaudePlatformProvider() || !isFirstPartyAnthropicBaseUrl();
}
//@ chunk-hwmsct5x.js:200047-200077 placement
/**
 * 默认 Opus 原生 1M。
 */
function isDefaultOpusNative1m() {
  return modelHasNative1MContext(getDefaultOpusModel());
}
//@ chunk-hwmsct5x.js:200077-200107 placement
function defaultSonnetHasNative1m() {
  return modelHasNative1MContext(getDefaultSonnetModel());
}
//@ chunk-hwmsct5x.js:200107-200437 placement
/**
 * 读取内置目录中某族最新模型（latest_per_family），返回 {id, displayName, key}；目录不一致时抛错。
 */
function getLatestFamilyModel(e) {
  let n = getModelCatalog_2().latest_per_family[e];
  let found = LEGACY_MODEL_IDS_2.find((y) => y === n);
  let s = found && getCatalogEntry(found);
  let h = s && MODEL_KEY_BY_FIRST_PARTY_ID[s.provider_ids.first_party];
  if (found === undefined || s === undefined || h === undefined)
    throw Error(
      "model-catalog.json: latest_per_family must name a models[] entry that has a CATALOG_ID_TO_KEY line in configs.ts",
    );
  return {
    id: found,
    displayName: s.display_name,
    key: h,
  };
}
//@ chunk-hwmsct5x.js:200502-200545 placement
/**
 * 该档当前主模型就是 catalog 的该档模型。
 */
function isTierDefaultCatalogModel(e) {
  return getCanonicalName(getDefaultModelForFamily(e)) === getLatestFamilyModel(e).id;
}
//@ chunk-hwmsct5x.js:200545-200753 layout
/**
 * 自定义档位模型的 label/description（ANTHROPIC_DEFAULT_*_MODEL_NAME/DESCRIPTION 优先）。
 */
function buildCustomTierLabel(e, n, r, s) {
  let h = r === undefined ? nameForUnnamedModelId(e) : undefined;
  let y = (n === "Sonnet" || n === "Opus") && has1mSuffix_2(e);
  return {
    label: r ?? h ?? e,
    description:
      s ?? (h !== undefined ? `Custom ${n} model (${e})` : `Custom ${n} model${y ? " (1M context)" : ""}`),
  };
}
//@ chunk-hwmsct5x.js:200753-201081 fingerprint = getCustomSonnetOption (0.796)
/**
 * ANTHROPIC_DEFAULT_SONNET_MODEL 设置且允许自定义行时的 Sonnet 选项（value "sonnet"）。
 */
function getCustomSonnetOption() {
  let customSonnetModel = env.ANTHROPIC_DEFAULT_SONNET_MODEL;
  if (allowsCustomTierOptions() && customSonnetModel) {
    let is1m = has1mSuffix_2(customSonnetModel);
    return {
      value: "sonnet",
      ...buildCustomTierLabel(
        customSonnetModel,
        "Sonnet",
        env.ANTHROPIC_DEFAULT_SONNET_MODEL_NAME,
        env.ANTHROPIC_DEFAULT_SONNET_MODEL_DESCRIPTION,
      ),
      descriptionForModel: `${env.ANTHROPIC_DEFAULT_SONNET_MODEL_DESCRIPTION ?? `Custom Sonnet model${is1m ? " with 1M context" : ""}`} (${customSonnetModel})`,
    };
  }
}
//@ chunk-hwmsct5x.js:201081-201121 layout
/**
 * 选项描述里的价格后缀（fast mode 时用 fast 价）。
 */
function getModelPriceSuffix(e, n) {
  return getModelPricingSuffix(isFastModeOnForModel(n, e), e);
}
//@ chunk-hwmsct5x.js:201121-201495 placement
/**
 * /model 选项中 Sonnet/Opus/Fable 的展示信息：标签、标语、给模型看的描述与价格后缀函数。
 */
var FAMILY_PRESENTATION = {
  sonnet: {
    label: "Sonnet",
    slogan: SONNET_SLOGAN,
    descriptionForModel: "efficient for routine tasks. Generally recommended for most coding tasks",
    suffix: (e) => getModelPriceSuffix(e, false),
  },
  opus: {
    label: "Opus",
    slogan: OPUS_SLOGAN,
    descriptionForModel: "best for everyday, complex tasks",
    suffix: getModelPriceSuffix,
  },
  fable: {
    label: "Fable",
    slogan: FABLE_SLOGAN,
    descriptionForModel: "most capable for your hardest and longest-running tasks",
    suffix: usageCreditsSuffix,
  },
};
//@ chunk-hwmsct5x.js:201495-201735 placement = generateModelSection (0.417)
/**
 * 生成模型选择器中某个模型选项：value、label、显示描述与给模型看的描述。旧版名 generateModelSection 来自 ConfigTool/prompt，实际属于模型选项。
 */
function generateModelSection(e, n = false) {
  let { id, displayName, key } = getLatestFamilyModel(e);
  let y = FAMILY_PRESENTATION[e];
  let w = usesFirstPartyModelIds() && isTierDefaultCatalogModel(e) ? e : getModelStrings()[key];
  let S = w === e ? getDefaultModelForFamily(e) : id;
  return {
    value: w,
    label: y.label,
    description: `${displayName} \xB7 ${y.slogan}${y.suffix(S, n)}`,
    descriptionForModel: `${displayName} - ${y.descriptionForModel}`,
  };
}
//@ chunk-hwmsct5x.js:201735-201918 placement
function getSonnet46Option() {
  return {
    value: !usesFirstPartyModelIds() ? getModelStrings().sonnet46 : "claude-sonnet-4-6",
    label: "Sonnet 4.6",
    description: "Sonnet 4.6 \xB7 Legacy",
    descriptionForModel: "Sonnet 4.6 - previous Sonnet version",
  };
}
//@ chunk-hwmsct5x.js:201918-202109 placement
function getSonnet5Option() {
  return {
    value: !usesFirstPartyModelIds() ? getModelStrings().sonnet5 : "claude-sonnet-5",
    label: "Sonnet 5",
    description: "Sonnet 5 \xB7 Previous Sonnet version",
    descriptionForModel: "Sonnet 5 - previous Sonnet version",
  };
}
//@ chunk-hwmsct5x.js:202109-202390 placement
function getCustomFableOption() {
  let ANTHROPIC_DEFAULT_FABLE_MODEL = env.ANTHROPIC_DEFAULT_FABLE_MODEL;
  if (allowsCustomTierOptions() && ANTHROPIC_DEFAULT_FABLE_MODEL)
    return {
      value: "fable",
      ...buildCustomTierLabel(
        ANTHROPIC_DEFAULT_FABLE_MODEL,
        "Fable",
        env.ANTHROPIC_DEFAULT_FABLE_MODEL_NAME,
        env.ANTHROPIC_DEFAULT_FABLE_MODEL_DESCRIPTION,
      ),
      descriptionForModel: `${env.ANTHROPIC_DEFAULT_FABLE_MODEL_DESCRIPTION ?? "Custom Fable model"} (${ANTHROPIC_DEFAULT_FABLE_MODEL})`,
    };
}
//@ chunk-hwmsct5x.js:202390-202428 placement
var USAGE_CREDITS_SUFFIX = " \xB7 Requires usage credits";
//@ chunk-hwmsct5x.js:202428-202473 placement
function usageCreditsSuffix(e) {
  return !usesPayAsYouGo() && isUsageCreditsModelBilled(parseUserSpecifiedModel(e))
    ? USAGE_CREDITS_SUFFIX
    : "";
}
//@ chunk-hwmsct5x.js:202473-202766 placement
function appendFableCreditSuffix(e) {
  if (e.disabled === true || typeof e.value !== "string") return e;
  let modelConfigById = findModelConfigById(stripAnyVersatileSuffix(e.value));
  if (!(
    e.value === "fable" ||
    e.value === "fable[1m]" ||
    modelConfigById === CLAUDE_FABLE_5_CONFIG ||
    modelConfigById === CLAUDE_FABLE_5_1_CONFIG
  ))
    return e;
  let s = e.description.endsWith(USAGE_CREDITS_SUFFIX)
    ? e.description.slice(0, -USAGE_CREDITS_SUFFIX.length)
    : e.description;
  return {
    ...e,
    description: `${s}${usageCreditsSuffix(e.value)}`,
  };
}
//@ chunk-hwmsct5x.js:202766-203001 placement
function getFableOption(defaultFableModel, n) {
  let r = fableDisplayName(defaultFableModel) ?? getLatestFamilyModel("fable").displayName;
  let s = isClaudeAISubscriber() ? "" : getModelPriceSuffix(defaultFableModel, n);
  return {
    value: "fable",
    label: "Fable",
    description: `${r} \xB7 ${FABLE_SLOGAN}${s}${usageCreditsSuffix(defaultFableModel)}`,
    descriptionForModel: `${r} - most capable for your hardest and longest-running tasks`,
  };
}
//@ chunk-hwmsct5x.js:203001-203248 placement
function getHaiku35Option(customModel) {
  let n =
    fableDisplayName(customModel) ??
    (anyModelDescribed(customModel, strippedCanonicalName(customModel))
      ? renderModelName(customModel)
      : undefined);
  if (n === undefined)
    return {
      ...generateModelSection("fable"),
      value: customModel,
    };
  return {
    value: customModel,
    label: n,
    description: `${n} \xB7 ${FABLE_SLOGAN}${usageCreditsSuffix(customModel)}`,
    descriptionForModel: `${n} - most capable for your hardest and longest-running tasks`,
  };
}
//@ chunk-hwmsct5x.js:203248-203346 placement
function fableDisplayName(e) {
  let catalogEntry = getCatalogEntry(
    strip1mSuffix(
      getCanonicalName(e, {
        identity: true,
      }),
    ),
  );
  return catalogEntry?.family === "fable" ? catalogEntry.display_name : undefined;
}
//@ chunk-hwmsct5x.js:203346-203660 fingerprint = getCustomOpusOption (0.793)
/**
 * ANTHROPIC_DEFAULT_OPUS_MODEL 对应的自定义 Opus 选项。
 */
function getCustomOpusOption() {
  let customOpusModel = env.ANTHROPIC_DEFAULT_OPUS_MODEL;
  if (allowsCustomTierOptions() && customOpusModel) {
    let is1m = has1mSuffix_2(customOpusModel);
    return {
      value: "opus",
      ...buildCustomTierLabel(
        customOpusModel,
        "Opus",
        env.ANTHROPIC_DEFAULT_OPUS_MODEL_NAME,
        env.ANTHROPIC_DEFAULT_OPUS_MODEL_DESCRIPTION,
      ),
      descriptionForModel: `${env.ANTHROPIC_DEFAULT_OPUS_MODEL_DESCRIPTION ?? `Custom Opus model${is1m ? " with 1M context" : ""}`} (${customOpusModel})`,
    };
  }
}
//@ chunk-hwmsct5x.js:203660-203800 fingerprint = getOpus41Option (0.855)
/**
 * "Opus 4.1 · Legacy" 选项。
 */
function getOpus41Option() {
  return {
    value: getModelStrings().opus41,
    label: "Opus 4.1",
    description: "Opus 4.1 \xB7 Legacy",
    descriptionForModel: "Opus 4.1 - legacy version",
  };
}
//@ chunk-hwmsct5x.js:203800-203971 placement = FAST_MODE_MODEL_DISPLAY (0.334)
/**
 * /model 选项 "Opus 4.6 · Legacy"。旧版名 FAST_MODE_MODEL_DISPLAY 为错配，应归 utils/model/modelOptions.ts。
 */
function getOpus46Option() {
  return {
    value: !usesFirstPartyModelIds() ? getModelStrings().opus46 : "claude-opus-4-6",
    label: "Opus 4.6",
    description: "Opus 4.6 \xB7 Legacy",
    descriptionForModel: "Opus 4.6 - previous Opus version",
  };
}
//@ chunk-hwmsct5x.js:203971-204142 layout
/**
 * /model 选项：Opus 4.7（Legacy）。
 */
function getOpus47Option() {
  return {
    value: !usesFirstPartyModelIds() ? getModelStrings().opus47 : "claude-opus-4-7",
    label: "Opus 4.7",
    description: "Opus 4.7 \xB7 Legacy",
    descriptionForModel: "Opus 4.7 - previous Opus version",
  };
}
//@ chunk-hwmsct5x.js:204142-204313 layout
/**
 * /model 选项：Opus 4.8（Legacy）。
 */
function getOpus48Option() {
  return {
    value: !usesFirstPartyModelIds() ? getModelStrings().opus48 : "claude-opus-4-8",
    label: "Opus 4.8",
    description: "Opus 4.8 \xB7 Legacy",
    descriptionForModel: "Opus 4.8 - previous Opus version",
  };
}
//@ chunk-hwmsct5x.js:204313-204490 layout
/**
 * /model 选项：Opus 5（上一代 Opus）。
 */
function getOpus5Option() {
  return {
    value: !usesFirstPartyModelIds() ? getModelStrings().opus5 : "claude-opus-5",
    label: "Opus 5",
    description: "Opus 5 \xB7 Previous Opus version",
    descriptionForModel: "Opus 5 - previous Opus version",
  };
}
//@ chunk-hwmsct5x.js:204490-204770 fingerprint = getSonnet46_1MOption (0.643)
/**
 * "Sonnet 4.6 (1M context)" 选项。
 */
function getSonnet46_1MOption() {
  return {
    value: !usesFirstPartyModelIds() ? getModelStrings().sonnet46 + "[1m]" : "claude-sonnet-4-6[1m]",
    label: "Sonnet 4.6 (1M context)",
    description: `Sonnet 4.6 for long sessions${getModelPriceSuffix("claude-sonnet-4-6", false)}`,
    descriptionForModel: "Sonnet 4.6 with 1M context window - for long sessions with large codebases",
  };
}
//@ chunk-hwmsct5x.js:204770-205080 layout
/**
 * "<Sonnet> (1M context)" 选项（sonnet[1m]）。
 */
function getSonnet1mOption() {
  let { id, displayName } = getLatestFamilyModel("sonnet");
  let r = {
    value: "sonnet[1m]",
    label: `${displayName} (1M context)`,
    descriptionForModel: `${displayName} with 1M context window - for long sessions with large codebases`,
  };
  if (isClaudeAISubscriber())
    return {
      ...r,
      description: `${displayName} for long sessions`,
    };
  return {
    ...r,
    description: `${displayName} for long sessions${getModelPriceSuffix(id, false)}`,
  };
}
//@ chunk-hwmsct5x.js:205080-205361 fingerprint = getOpus46_1MOption (0.594)
/**
 * "Opus 4.6 (1M context)" 选项。
 */
function getOpus46_1MOption(fastMode = false, n = true) {
  return {
    value: !usesFirstPartyModelIds() ? getModelStrings().opus46 + "[1m]" : "claude-opus-4-6[1m]",
    label: "Opus 4.6 (1M context)",
    description: `Opus 4.6 for long sessions${n ? getModelPriceSuffix("claude-opus-4-6", fastMode) : ""}`,
    descriptionForModel: "Opus 4.6 with 1M context window - for long sessions with large codebases",
  };
}
//@ chunk-hwmsct5x.js:205361-205635 fingerprint = getMergedOpus1MOption (0.597)
/**
 * 合并后的 "Opus (1M context)" 选项（opus[1m] 或当前提供商的 Opus 字符串 + [1m]）。
 */
function getMergedOpus1MOption(fastMode = false) {
  let is3P = !usesFirstPartyModelIds();
  let { id, displayName, key } = getLatestFamilyModel("opus");
  return {
    value: is3P ? getModelStrings()[key] + "[1m]" : "opus[1m]",
    label: "Opus (1M context)",
    description: `${displayName} for long sessions${getModelPriceSuffix(id, fastMode)}`,
    descriptionForModel: `${displayName} with 1M context window - for long sessions with large codebases`,
  };
}
//@ chunk-hwmsct5x.js:205635-205916 fingerprint = getCustomHaikuOption (0.837)
/**
 * ANTHROPIC_DEFAULT_HAIKU_MODEL 对应的自定义 Haiku 选项。
 */
function getCustomHaikuOption() {
  let customHaikuModel = env.ANTHROPIC_DEFAULT_HAIKU_MODEL;
  if (allowsCustomTierOptions() && customHaikuModel)
    return {
      value: "haiku",
      ...buildCustomTierLabel(
        customHaikuModel,
        "Haiku",
        env.ANTHROPIC_DEFAULT_HAIKU_MODEL_NAME,
        env.ANTHROPIC_DEFAULT_HAIKU_MODEL_DESCRIPTION,
      ),
      descriptionForModel: `${env.ANTHROPIC_DEFAULT_HAIKU_MODEL_DESCRIPTION ?? "Custom Haiku model"} (${customHaikuModel})`,
    };
}
//@ chunk-hwmsct5x.js:205916-206132 fingerprint = getHaiku45Option (0.707)
/**
 * Haiku 选项（"<Haiku 显示名> · Fastest for quick answers"）。
 */
function getHaiku45Option() {
  let defaultHaikuModel = getDefaultHaikuModel();
  let n = getPublicModelDisplayName(defaultHaikuModel) ?? "Haiku";
  return {
    value: "haiku",
    label: "Haiku",
    description: `${n} \xB7 ${HAIKU_SLOGAN}${getModelPriceSuffix(defaultHaikuModel, false)}`,
    descriptionForModel: `${n} - fastest for quick answers. Lower cost but less capable than Sonnet.`,
  };
}
//@ chunk-hwmsct5x.js:206132-206235 layout
/**
 * Pro 订阅且 tengu_gypsum_kite 时提示 "~2× usage vs Sonnet"。
 */
function getProUsageMultiplierNote() {
  if (getSubscriptionType() === "pro" && getFeatureValue_CACHED_MAY_BE_STALE("tengu_gypsum_kite", false))
    return " \xB7 ~2\xD7 usage vs Sonnet";
  return "";
}
//@ chunk-hwmsct5x.js:206235-206379 fingerprint = getMaxOpusOption (0.899)
/**
 * 订阅用户的 Opus 选项（可附 Pro 用量提示）。
 */
function getMaxOpusOption(fastMode = false) {
  let { id, displayName } = getLatestFamilyModel("opus");
  let s = fastMode ? getModelPriceSuffix(id, false) : "";
  return {
    value: "opus",
    label: "Opus",
    description: `${displayName} \xB7 ${OPUS_SLOGAN}${getProUsageMultiplierNote()}${s}`,
  };
}
//@ chunk-hwmsct5x.js:206379-206629 callgraph-fingerprint = getMaxSonnet46_1MOption (0.248)
/**
 * 订阅用户的 "Sonnet 4.6 (1M context)"（可能注明耗用 usage credits）。
 */
function getMaxSonnet46_1MOption() {
  let e = !usesFirstPartyModelIds();
  let n = isClaudeAISubscriber() ? " \xB7 Draws from usage credits" : "";
  let r = n === "" ? "" : getModelPriceSuffix("claude-sonnet-4-6", false);
  return {
    value: e ? getModelStrings().sonnet46 + "[1m]" : "claude-sonnet-4-6[1m]",
    label: "Sonnet 4.6 (1M context)",
    description: `Sonnet 4.6 with 1M context${n}${r}`,
  };
}
//@ chunk-hwmsct5x.js:206629-206844 fingerprint = getMaxOpus46_1MOption (0.551)
/**
 * 订阅用户的 "Opus (1M context)"。
 */
function getMaxOpus46_1MOption() {
  let e = isClaudeAISubscriber() ? " \xB7 Draws from usage credits" : "";
  let { id, displayName } = getLatestFamilyModel("opus");
  let s = e === "" ? "" : getModelPriceSuffix(id, false);
  return {
    value: "opus[1m]",
    label: "Opus (1M context)",
    description: `${displayName} with 1M context${getProUsageMultiplierNote()}${e}${s}`,
  };
}
//@ chunk-hwmsct5x.js:206844-207137 callgraph-witnessed = getOpus46Option (0.392)
/**
 * 默认 Opus 走 1M 时的 "Opus (1M context)" 选项。旧版名 getOpus46Option 不准确。
 */
function getOpus1mDefaultOption(e = false, n = false) {
  let r = !usesFirstPartyModelIds();
  let defaultOpusModel = getDefaultOpusModel();
  let h = getMarketingNameForModel(stripAnyVersatileSuffix(defaultOpusModel)) ?? "Opus";
  let y = e ? getModelPriceSuffix(defaultOpusModel, n) : "";
  return {
    value: r ? getModelStrings()[getLatestFamilyModel("opus").key] + "[1m]" : "opus[1m]",
    label: "Opus (1M context)",
    description: `${h} with 1M context \xB7 ${OPUS_SLOGAN}${getProUsageMultiplierNote()}${y}`,
    descriptionForModel: `${h} with 1M context - best for everyday, complex tasks`,
  };
}
//@ chunk-hwmsct5x.js:207137-207240 fingerprint = MaxSonnet46Option (1)
/**
 * 订阅用户的 Sonnet 选项。
 */
function MaxSonnet46Option() {
  return {
    value: "sonnet",
    label: "Sonnet",
    description: `${getMarketingNameForModel(stripAnyVersatileSuffix(getDefaultSonnetModel())) ?? "Sonnet"} \xB7 ${SONNET_SLOGAN}`,
  };
}
//@ chunk-hwmsct5x.js:207240-207336 fingerprint = MaxHaiku45Option (1)
/**
 * 订阅用户的 Haiku 选项。
 */
function MaxHaiku45Option() {
  return {
    value: "haiku",
    label: "Haiku",
    description: `${getPublicModelDisplayName(getDefaultHaikuModel()) ?? "Haiku"} \xB7 ${HAIKU_SLOGAN}`,
  };
}
//@ chunk-hwmsct5x.js:207336-207452 fingerprint = getOpusPlanOption (0.779)
/**
 * "Opus Plan Mode"：plan 模式用 Opus，其余用 Sonnet（opusplan）。
 */
function getOpusPlanOption() {
  return {
    value: "opusplan",
    label: "Opus Plan Mode",
    description: "Use Opus in plan mode, Sonnet otherwise",
  };
}
//@ chunk-hwmsct5x.js:207452-207475 layout
/**
 * 空实现（构建裁剪掉的选项钩子）。
 */
function noopModelOption(e) {
  return;
}
//@ chunk-hwmsct5x.js:207475-207589 layout = aliasMatchesParentTier (0.792)
/**
 * 在选项列表里补上默认模型所在族与指定族的行。
 */
function ensureFamilyOptionRows(e, fastMode, r) {
  let canonical = getModelFamilyFromString(getDefaultMainLoopModelSetting());
  let h = (canonical === "opus" || canonical === "sonnet") && canonical !== r ? [canonical, r] : [r];
  for (let y of h) ensureTierOptionPresent(e, y, fastMode);
  return e;
}
//@ chunk-hwmsct5x.js:207589-207771 layout
/**
 * /model 选项列表里没有 sonnet/opus（含 opus[1m]）时插入对应默认选项（放在“默认”项之后）。
 */
function ensureTierOptionPresent(e, n, r) {
  let s = n === "opus" && opus1mMergeTagsDefaultOpus();
  if (e.some((y) => y.value === n || (s && y.value === `${n}[1m]`))) return;
  let h = n === "sonnet" ? getSonnetOption() : getOpusOption(r);
  e.splice(e.findIndex((y) => y.value === null) + 1, 0, h);
}
//@ chunk-hwmsct5x.js:207771-208021 layout
/**
 * Sonnet 选项（catalog 默认时可能用精简行）。
 */
function getSonnetOption(e = false) {
  let n = isClaudeAISubscriber();
  if (isTierDefaultCatalogModel("sonnet")) return n ? MaxSonnet46Option() : generateModelSection("sonnet");
  let defaultSonnetModel = getDefaultSonnetModel();
  let s = getMarketingNameForModel(stripAnyVersatileSuffix(defaultSonnetModel)) ?? "Sonnet";
  let h = e ? getModelPriceSuffix(defaultSonnetModel, false) : "";
  return {
    value: "sonnet",
    label: "Sonnet",
    description: `${s} \xB7 ${SONNET_SLOGAN}${h}`,
    descriptionForModel: `${s} - efficient for routine tasks`,
  };
}
//@ chunk-hwmsct5x.js:208021-208291 layout
/**
 * Opus 选项；默认 Opus 1M optIn 时返回 "Opus (1M context)"。auto 名 getHaiku35Option 为错配。
 */
function getOpusOption(e) {
  let n = isClaudeAISubscriber();
  if (opus1mMergeTagsDefaultOpus()) return getOpus1mDefaultOption(!n, e);
  if (isTierDefaultCatalogModel("opus")) return n ? getMaxOpusOption(false) : generateModelSection("opus", e);
  let defaultOpusModel = getDefaultOpusModel();
  let s = getMarketingNameForModel(stripAnyVersatileSuffix(defaultOpusModel)) ?? "Opus";
  let h = n ? "" : getModelPriceSuffix(defaultOpusModel, e);
  return {
    value: "opus",
    label: "Opus",
    description: `${s} \xB7 ${OPUS_SLOGAN}${h}`,
    descriptionForModel: `${s} - best for everyday, complex tasks`,
  };
}
//@ chunk-hwmsct5x.js:208291-209773 callgraph-witnessed = getModelOptionsBase (0)
/**
 * 内置选项列表：订阅用户（有 Opus 权限/无）、第一方类提供商、第三方提供商三套组合，按可用性加入各族及 1M 变体与自定义档位行。
 */
function getModelOptionsBase(fastMode = false) {
  if (isClaudeAISubscriber()) {
    if (isOpusDefaultSubscriber()) {
      let premiumOptions = [getDefaultOptionForUser(fastMode)];
      if (!isOpus1mMergeEnabled() && shouldProbeThirdPartyDefaults() && !isDefaultOpusNative1m())
        premiumOptions.push(getMaxOpus46_1MOption());
      premiumOptions.push(MaxSonnet46Option());
      if (shouldProbeThirdPartyDefaultsAlt() && !defaultSonnetHasNative1m())
        premiumOptions.push(
          isTierDefaultCatalogModel("sonnet") ? getSonnet1mOption() : getMaxSonnet46_1MOption(),
        );
      premiumOptions.push(MaxHaiku45Option());
      return ensureFamilyOptionRows(premiumOptions, fastMode, "opus");
    }
    let standardOptions = [getDefaultOptionForUser(fastMode)];
    if (shouldProbeThirdPartyDefaultsAlt() && !defaultSonnetHasNative1m())
      standardOptions.push(
        isTierDefaultCatalogModel("sonnet") ? getSonnet1mOption() : getMaxSonnet46_1MOption(),
      );
    if (opus1mMergeTagsDefaultOpus()) standardOptions.push(getOpus1mDefaultOption());
    else {
      standardOptions.push(getMaxOpusOption(false));
      if (shouldProbeThirdPartyDefaults() && !isDefaultOpusNative1m())
        standardOptions.push(getMaxOpus46_1MOption());
    }
    standardOptions.push(MaxHaiku45Option());
    return ensureFamilyOptionRows(standardOptions, fastMode, "sonnet");
  }
  if (usesFirstPartyModelIds()) {
    let payg1POptions = [getDefaultOptionForUser(fastMode)];
    let customOpusOption = getCustomOpusOption();
    if (customOpusOption !== undefined) payg1POptions.push(customOpusOption);
    else if (
      !isOpus1mMergeEnabled() &&
      shouldProbeThirdPartyDefaults() &&
      !isDefaultOpusNative1m() &&
      !isPublishedCatalogInUse()
    )
      payg1POptions.push(getMergedOpus1MOption(fastMode));
    let customSonnetOption = getCustomSonnetOption();
    if (customSonnetOption !== undefined) payg1POptions.push(customSonnetOption);
    else if (isTierDefaultCatalogModel("sonnet")) {
      payg1POptions.push(generateModelSection("sonnet"));
      if (shouldProbeThirdPartyDefaultsAlt() && !defaultSonnetHasNative1m())
        payg1POptions.push(getSonnet1mOption());
    } else if (isPublishedCatalogInUse() && withCatalogSuppressed(() => isTierDefaultCatalogModel("sonnet")))
      payg1POptions.push(getSonnetOption(true));
    else {
      if (isModelAvailableOnProvider(getLatestFamilyModel("sonnet").key))
        payg1POptions.push(generateModelSection("sonnet"));
      if (isModelAvailableOnProvider("sonnet5")) payg1POptions.push(getSonnet5Option());
      payg1POptions.push(getSonnet46Option());
      if (shouldProbeThirdPartyDefaultsAlt()) payg1POptions.push(getSonnet46_1MOption());
    }
    payg1POptions.push(getCustomHaikuOption() ?? getHaiku45Option());
    let customFableOption = getCustomFableOption();
    if (customFableOption !== undefined) filterModelOptionsByAllowlist(payg1POptions, customFableOption);
    else if (isClaudePlatformProvider() && isModelAvailableOnProvider(getLatestFamilyModel("fable").key))
      filterModelOptionsByAllowlist(payg1POptions, generateModelSection("fable"));
    return ensureFamilyOptionRows(payg1POptions, fastMode, "opus");
  }
  let payg3pOptions = [getDefaultOptionForUser(fastMode)];
  let customSonnet = getCustomSonnetOption();
  if (customSonnet !== undefined) payg3pOptions.push(customSonnet);
  else {
    if (isModelAvailableOnProvider(getLatestFamilyModel("sonnet").key))
      payg3pOptions.push(generateModelSection("sonnet"));
    if (isModelAvailableOnProvider("sonnet5")) payg3pOptions.push(getSonnet5Option());
    if (isModelAvailableOnProvider("sonnet46")) {
      payg3pOptions.push(getSonnet46Option());
      if (shouldProbeThirdPartyDefaultsAlt()) payg3pOptions.push(getSonnet46_1MOption());
    }
  }
  let customOpus = getCustomOpusOption();
  if (customOpus !== undefined) payg3pOptions.push(customOpus);
  else {
    if (isModelAvailableOnProvider("opus41")) payg3pOptions.push(getOpus41Option());
    let key = getLatestFamilyModel("opus").key;
    if (isModelAvailableOnProvider(key)) {
      payg3pOptions.push(generateModelSection("opus"));
      if (shouldProbeThirdPartyDefaults() && !modelHasNative1MContext(getModelStrings()[key]))
        payg3pOptions.push(getMergedOpus1MOption());
    }
    if (isModelAvailableOnProvider("opus5")) payg3pOptions.push(getOpus5Option());
    if (isModelAvailableOnProvider("opus48")) payg3pOptions.push(getOpus48Option());
    if (isModelAvailableOnProvider("opus47")) payg3pOptions.push(getOpus47Option());
    if (isModelAvailableOnProvider("opus46")) {
      payg3pOptions.push(getOpus46Option());
      if (shouldProbeThirdPartyDefaults()) payg3pOptions.push(getOpus46_1MOption(fastMode));
    }
  }
  let customHaiku = getCustomHaikuOption();
  if (customHaiku !== undefined) payg3pOptions.push(customHaiku);
  else if (isModelAvailableOnProvider("haiku45") || isModelAvailableOnProvider("haiku35"))
    payg3pOptions.push(getHaiku45Option());
  let customFableOption = getCustomFableOption();
  if (customFableOption !== undefined || isModelAvailableOnProvider(getLatestFamilyModel("fable").key))
    filterModelOptionsByAllowlist(payg3pOptions, customFableOption ?? generateModelSection("fable"));
  return payg3pOptions;
}
//@ chunk-hwmsct5x.js:209773-210483 placement = getAgentModelOptions (0.574)
/**
 * 给任意模型 id 构造 /model 选项：有已知族时用族口号，若有更新版本提示 "Newer version available · select <族>"；未知族为 "Custom model (id)"。旧版名 getAgentModelOptions 不准确。
 */
function buildModelOptionForId(e) {
  let marketingNameForModel = getMarketingNameForModel(e);
  if (!marketingNameForModel) return null;
  let canonicalName = getCanonicalName(e);
  let s = null;
  if (canonicalName.includes("fable"))
    s = {
      alias: "Fable",
      aliasModel: getDefaultFableModel(),
      slogan: FABLE_SLOGAN,
    };
  else if (canonicalName.includes("sonnet"))
    s = {
      alias: "Sonnet",
      aliasModel: getDefaultSonnetModel(),
      slogan: SONNET_SLOGAN,
    };
  else if (canonicalName.includes("opus"))
    s = {
      alias: "Opus",
      aliasModel: getDefaultOpusModel(),
      slogan: OPUS_SLOGAN,
    };
  else if (canonicalName.includes("haiku"))
    s = {
      alias: "Haiku",
      aliasModel: getDefaultHaikuModel(),
      slogan: HAIKU_SLOGAN,
    };
  if (!s)
    return {
      value: e,
      label: marketingNameForModel,
      description: `Custom model (${e})`,
    };
  let marketingNameForModel_2 = getMarketingNameForModel(s.aliasModel);
  let mapped = Object.values(catalogEntriesByFirstPartyId).map((S) => getCanonicalName(S.firstParty));
  let index = mapped.indexOf(canonicalName);
  if (
    marketingNameForModel_2 &&
    index !== -1 &&
    index < mapped.indexOf(getCanonicalName(s.aliasModel)) &&
    isModelAllowed(s.aliasModel)
  )
    return {
      value: e,
      label: marketingNameForModel,
      description: `Newer version available \xB7 select ${s.alias} for ${marketingNameForModel_2}`,
    };
  return {
    value: e,
    label: marketingNameForModel,
    description: `${s.slogan} (${e})`,
  };
}
//@ chunk-hwmsct5x.js:210483-210616 placement
/**
 * 选项标签只是原始 id 时换成目录显示名，原标签放进描述。
 */
function relabelOptionFromCatalog(e) {
  if (!isSanitizedModelOption(e)) return e;
  let n = nameForUnnamedModelId(e.value);
  return n === undefined
    ? e
    : {
        ...e,
        label: n,
        description: `${e.description} (${e.label})`,
      };
}
//@ chunk-hwmsct5x.js:210616-210674 placement
/**
 * 去掉 disabled 行的模型选项。
 */
function getEnabledModelOptions(e = false) {
  return buildModelPickerOptions(e).filter((n) => !n.disabled);
}
//@ chunk-hwmsct5x.js:210674-210708 placement
/**
 * 只在 claude-vscode 入口展示不可用模型行。
 */
var VSCODE_ENTRYPOINTS = new Set(["claude-vscode"]);
//@ chunk-hwmsct5x.js:210708-211169 placement
/**
 * VS Code 入口、第一方直连时返回被禁用的模型行（并记 model_unavailable_gate）。
 */
function getUnavailableModelRows(e) {
  if (!VSCODE_ENTRYPOINTS.has(env.CLAUDE_CODE_ENTRYPOINT ?? "")) return [];
  let n = count(e, (s) => s.disabled === true);
  let r = {
    total: e.length,
    disabled: n,
  };
  if (getAPIProvider() !== "firstParty") {
    if (n > 0) logFeatureSad("model_unavailable_gate", "suppressed_rows_non_first_party", r);
    else logFeatureOk("model_unavailable_gate", r);
    return [];
  }
  if (!isFirstPartyAnthropicBaseUrl()) {
    if (n > 0) logFeatureSad("model_unavailable_gate", "suppressed_rows_foreign_base_url", r);
    else logFeatureOk("model_unavailable_gate", r);
    return [];
  }
  logFeatureOk("model_unavailable_gate", r);
  return e.filter((s) => s.disabled === true);
}
//@ chunk-hwmsct5x.js:211169-211202 placement
/**
 * 对全部选项调用 getUnavailableModelRows。
 */
function getUnavailableModelOptions() {
  return getUnavailableModelRows(buildModelPickerOptions());
}
//@ chunk-hwmsct5x.js:211202-211344 placement
/**
 * 统计被丢弃的选项及原因（entitlement_denied/managed_denied/allowlist_filtered）。
 */
function recordDroppedModelOption(e, n, modelEntitlementDenySet) {
  if (e === null) return;
  e.dropped++;
  e.dropReasons.add(
    isModelDenied(n, modelEntitlementDenySet)
      ? "entitlement_denied"
      : isModelDeniedSafe(n)
        ? "managed_denied"
        : "allowlist_filtered",
  );
}
//@ chunk-hwmsct5x.js:211344-211393 placement
/**
 * deniedModels 判定，出错视为未拒绝。
 */
function isModelDeniedSafe(e) {
  try {
    return isModelDeniedByManagedSettings(e);
  } catch {
    return false;
  }
}
//@ chunk-hwmsct5x.js:211393-211905 placement
/**
 * 生成模型选项并记 model_picker_options（总数、禁用、丢弃、重复、精选行）。
 */
function getModelOptionsWithTelemetry(e = false, n) {
  let r = {
    dropped: 0,
    duplicates: 0,
    dropReasons: new Set(),
    disabledReasons: new Set(),
    curatedRows: 0,
    curatedReplaced: false,
  };
  try {
    let modelPickerOptions = buildModelPickerOptions(e, r);
    logFeatureOk("model_picker_options", {
      total: modelPickerOptions.length,
      disabled: count(modelPickerOptions, (h) => h.disabled === true),
      dropped: r.dropped,
      duplicates: r.duplicates,
      curated_rows: r.curatedRows,
      curated_replaced: r.curatedReplaced,
    });
    for (let dropReason of r.dropReasons) logFeatureSad("model_picker_options", dropReason);
    for (let disabledReason of r.disabledReasons) logFeatureSad("model_picker_options", disabledReason);
    return modelPickerOptions;
  } catch (error) {
    logFeatureBad("model_picker_options", "build_failed");
    throw error;
  }
}
//@ chunk-hwmsct5x.js:211905-213303 placement
/**
 * 去重模型选项；服务端目录里不可选的行标为禁用；组织默认行加注；model-error-overrides 命中的行禁用；禁用行排到最后。
 */
function buildModelPickerOptions(e = false, n = null) {
  let r = new Set();
  let filtered = getModelOptions(e, n).filter((z) => {
    if (z.value === null) return true;
    if (r.has(z.value)) {
      if (n !== null) n.duplicates++;
      logForDebugging(`model options: dropping duplicate row "${z.label}" (value ${z.value})`, {
        level: "warn",
      });
      return false;
    }
    r.add(z.value);
    return true;
  });
  let h = isPublishedCatalogInUse() ? activeServedCatalog() : null;
  let y =
    h === null
      ? []
      : buildCatalogRows({
          catalog: h,
          provenance: "published",
        }).filter((z) => !z.selectable);
  let w =
    y.length === 0
      ? filtered
      : filtered.map((z) => {
          if (z.value === null || z.disabled === true) return z;
          let userSpecifiedModel = parseUserSpecifiedModel(z.value);
          let servedModel = findServedModel(userSpecifiedModel);
          let activeServedByIdentity = findActiveServedByIdentity(userSpecifiedModel);
          let entry = y.find(
            (ne) =>
              ne.row === servedModel ||
              ne.row === activeServedByIdentity ||
              ne.key === normalizeModelId(userSpecifiedModel),
          );
          let Q = entry === undefined ? null : buildCatalogModelOption(entry);
          if (entry === undefined || Q === null) return z;
          n?.disabledReasons.add(isActiveCatalogModel(entry.row) ? "not_offered" : "server_disabled");
          return {
            ...z,
            disabled: true,
            description: Q.description,
          };
        });
  let { setting, attribution } = resolveDefaultMainLoopModelSetting();
  let R = attribution === "org" ? setting : null;
  let L = R
    ? getCanonicalName(R, {
        identity: true,
      })
    : null;
  let O = R ? /\[1m\]$/i.test(R) : false;
  let M = L
    ? w.map((z) => {
        if (z.value === null || isModeDependentModelSetting(z.value)) return z;
        let userSpecifiedModel = parseUserSpecifiedModel(z.value);
        if (
          getCanonicalName(userSpecifiedModel, {
            identity: true,
          }) !== L ||
          /\[1m\]$/i.test(userSpecifiedModel) !== O
        )
          return z;
        return {
          ...z,
          description: `${z.description}${defaultModelAttributionSuffix("org")}`,
        };
      })
    : w;
  let mapped = markFableCreditRequired(M, n).map((z) => {
    if (z.disabled === true) return z;
    try {
      let G = pickerHintFromOverride(
        getCanonicalName(z.value === null ? getDefaultMainLoopModel() : parseUserSpecifiedModel(z.value)),
      );
      if (G !== null) {
        if (n !== null) n.disabledReasons.add("error_override");
        return {
          ...z,
          disabled: true,
          description: G,
        };
      }
    } catch (error) {
      logForDebugging(`model-error-overrides picker hint failed: ${error}`, {
        level: "error",
      });
    }
    return z;
  });
  let filtered_2 = mapped.filter((z) => z.disabled === true);
  if (filtered_2.length === 0) return mapped;
  return [...mapped.filter((z) => z.disabled !== true), ...filtered_2];
}
//@ chunk-hwmsct5x.js:213303-213848 placement
/**
 * 有服务端模型目录时按目录行生成选项（第三方走 X_；第一方合并档位自定义行），否则 null。
 */
function getCatalogDrivenModelOptions(baseContext, stats) {
  let r = activeServedCatalog();
  if (r === null || isPublishedCatalogInUse()) return null;
  let entries = buildCatalogRows({
    catalog: r,
    provenance: servedCatalogSource() === "published" ? "published" : "served",
  });
  let h = !isServedCatalogActive();
  let y = isPublishedCatalogActive();
  if (y && !usesFirstPartyModelIds()) return mergeCatalogOptions(entries, baseContext, stats);
  let w = y && allowsCustomTierOptions();
  let S = [getDefaultOptionForUser(baseContext)];
  let E = [];
  let R = (M) => {
    if (typeof M.value === "string" && isFableFamilyValue(M.value)) E.push(M);
    else S.push(M);
  };
  let L = w ? getCustomTierOptions() : [];
  let O = new Set();
  for (let M of entries) {
    let found = L.find(([j]) => j === M.family);
    if (found !== undefined) {
      if (!O.has(found[0])) {
        O.add(found[0]);
        R(found[1]);
      }
      continue;
    }
    let catalogOption = toCatalogOption(M, h, stats);
    if (catalogOption === null) continue;
    if (w) R(catalogOption);
    else S.push(catalogOption);
  }
  for (let [M, P] of L) if (!O.has(M)) R(P);
  for (let M of E) filterModelOptionsByAllowlist(S, M);
  return S;
}
//@ chunk-hwmsct5x.js:213848-213970 placement = aliasMatchesParentTier (0.852)
/**
 * ANTHROPIC_DEFAULT_{SONNET,OPUS,HAIKU,FABLE}_MODEL 对应的自定义选项。
 */
function getCustomTierOptions() {
  return [
    ["sonnet", getCustomSonnetOption()],
    ["opus", getCustomOpusOption()],
    ["haiku", getCustomHaikuOption()],
    ["fable", getCustomFableOption()],
  ].flatMap(([e, n]) => (n === undefined ? [] : [[e, n]]));
}
//@ chunk-hwmsct5x.js:213970-214250 placement
function toCatalogOption(entry, n, r) {
  let catalogModelOption = buildCatalogModelOption(entry);
  if (catalogModelOption === null) return null;
  let h = n ? applyUnavailability(catalogModelOption) : catalogModelOption;
  if (h === null) {
    if (r !== null) {
      r.dropped++;
      r.dropReasons.add("entitlement_denied");
    }
    return null;
  }
  if (h.disabled === true && r !== null)
    r.disabledReasons.add(
      catalogModelOption.disabled === true && isActiveCatalogModel(entry.row)
        ? "not_offered"
        : "server_disabled",
    );
  return h;
}
//@ chunk-hwmsct5x.js:214250-215482 placement
/**
 * 用服务端目录过滤并补充内置模型选项：按模型字符串映射到目录行，可选行保留、隐藏行去掉、不可用行显示为禁用并附通知，再追加目录中其他非弃用模型。
 */
function mergeCatalogOptions(entries, baseContext, stats) {
  let modelStrings = getModelStrings();
  let keyById = new Map();
  for (let key of Object.keys(modelStrings)) {
    let P = normalizeModelId(strip1mSuffix(String(modelStrings[key])));
    if (isModelAvailableOnProvider(key) && !keyById.has(P)) keyById.set(P, key);
  }
  let customTierFamilies = new Set(getCustomTierOptions().map(([M]) => M));
  let resolveKey = (M) => {
    let P = strip1mSuffix(M);
    if (!isBaseModelKey(P)) return keyById.get(normalizeModelId(P));
    if (customTierFamilies.has(P)) return "pinned";
    return keyById.get(normalizeModelId(strip1mSuffix(String(parseUserSpecifiedModel(P)))));
  };
  let defaultKeys = new Set();
  for (let M of [getDefaultOpusModel(), getDefaultSonnetModel(), getDefaultHaikuModel()]) {
    let P = keyById.get(normalizeModelId(strip1mSuffix(String(M))));
    if (P !== undefined) defaultKeys.add(P);
  }
  let selectableKeys = new Set();
  let inactiveRows = new Map();
  let hiddenKeys = new Set();
  for (let entry of entries) {
    let P = entryModelKey(entry.row.id);
    if (P === undefined) continue;
    if (isRowNotOnProvider(entry.row)) {
      hiddenKeys.add(P);
      continue;
    }
    if (entry.selectable) selectableKeys.add(P);
    else if (!isActiveCatalogModel(entry.row) && entry.row.section !== "deprecated" && !inactiveRows.has(P))
      inactiveRows.set(P, entry.row);
  }
  let options = [];
  for (let M of getModelOptionsBase(baseContext)) {
    if (M.value === null) {
      options.push(M);
      continue;
    }
    let key = resolveKey(M.value);
    if (key === "pinned") {
      options.push(M);
      continue;
    }
    if (key === undefined) continue;
    if (selectableKeys.has(key)) {
      options.push(M);
      continue;
    }
    if (hiddenKeys.has(key)) continue;
    let inactiveRow = inactiveRows.get(key);
    if (inactiveRow === undefined && defaultKeys.has(key)) {
      options.push(M);
      continue;
    }
    if (inactiveRow === undefined || strip1mSuffix(M.value) !== M.value) continue;
    options.push({
      ...M,
      disabled: true,
      description:
        markdownSafeText(inactiveRow.selection_notice?.text ?? inactiveRow.notice?.text ?? "") ||
        "Not available",
    });
    if (stats !== null) stats.disabledReasons.add("server_disabled");
  }
  for (let entry of entries) {
    if (
      entry.row.section === "deprecated" ||
      isRowNotOnProvider(entry.row) ||
      entryModelKey(entry.row.id) !== undefined ||
      (entry.family !== undefined && customTierFamilies.has(entry.family))
    )
      continue;
    let catalogOption = toCatalogOption(entry, true, stats);
    if (catalogOption !== null) options.push(catalogOption);
  }
  return options;
}
//@ chunk-hwmsct5x.js:215482-215689 placement
function applyUnavailability(catalogModelOption) {
  if (catalogModelOption.disabled === true || catalogModelOption.value === null) return catalogModelOption;
  let modelUnavailabilityReason = getModelUnavailabilityReason(catalogModelOption.value);
  if (modelUnavailabilityReason === null) return catalogModelOption;
  switch (modelUnavailabilityReason.reason) {
    case "disabled":
      return {
        ...catalogModelOption,
        disabled: true,
        description: modelUnavailabilityReason.description,
      };
    case "absent":
      return null;
  }
}
//@ chunk-hwmsct5x.js:215689-216239 placement
/**
 * 把目录行转为 /model 选项：标签取名称/营销名（保密模型遮盖代号）；不可选时显示为禁用并带通知或最低版本说明；可选时值优先用别名族。
 */
function buildCatalogModelOption(entry) {
  let { row } = entry;
  let isConfidential = row.confidential === true;
  let label =
    sanitizeTitle(row.name ?? "") ||
    getMarketingNameForModel(row.id) ||
    sanitizeTitle(isConfidential ? maskModelCodename(strip1mSuffix(row.id)) : row.id) ||
    "Unknown model";
  let description = passthroughDescription(markdownSafeText(row.description ?? ""), row);
  if (!entry.selectable) {
    if (isRowNotOnProvider(row)) return null;
    let notice;
    if (!isActiveCatalogModel(row))
      notice = markdownSafeText(row.selection_notice?.text ?? row.notice?.text ?? "");
    else if (!activeCatalogRowKnown(row)) notice = getUnsupportedModelMessage(row);
    else return null;
    return {
      value: row.id,
      label,
      description: (notice === "" ? description : passthroughDescription(notice, row)) || "Not available",
      disabled: true,
    };
  }
  let providerModelId = resolveProviderModelId(row) ?? row.id;
  let aliasFamily = entry.aliasFamily ?? (entry.family === "fable" ? "fable" : undefined);
  return {
    value:
      (aliasFamily !== undefined && isExcludedModel(entry, aliasFamily) ? aliasFamily : undefined) ??
      providerModelId,
    label,
    description: description || passthroughDescription(getFamilySlogan(entry.family), row),
  };
}
//@ chunk-hwmsct5x.js:216239-216265 placement
function passthroughDescription(e, row) {
  return e;
}
//@ chunk-hwmsct5x.js:216265-216375 placement = isExcludedModel (0.817)
function isExcludedModel(entry, aliasFamily) {
  let userSpecifiedModel = parseUserSpecifiedModel(aliasFamily);
  if (usesFirstPartyModelIds()) return normalizeModelId(userSpecifiedModel) === entry.key;
  return (
    aliasFamily === "haiku" &&
    normalizeModelId(
      getCanonicalName(userSpecifiedModel, {
        identity: true,
      }),
    ) === entry.key
  );
}
//@ chunk-hwmsct5x.js:216375-216506 layout = aliasMatchesParentTier (0.852)
/**
 * 族口号（Opus：Best for everyday, complex tasks 等）。
 */
function getFamilySlogan(alias) {
  switch (alias) {
    case "opus":
      return OPUS_SLOGAN;
    case "sonnet":
      return SONNET_SLOGAN;
    case "haiku":
      return HAIKU_SLOGAN;
    case "fable":
      return FABLE_SLOGAN;
    default:
      return "";
  }
}
//@ chunk-hwmsct5x.js:216506-219700 fingerprint = getModelOptions (0.541)
/**
 * /model 选项总装：服务端目录或内置列表 → ANTHROPIC_CUSTOM_MODEL_OPTION → 网关发现模型 → 附加模型选项 → Fable 行 → availableModels 里的显式模型 → 服务端目录补行 → 白名单过滤 → 确保当前设置的模型（含 opusplan/opus/opus[1m]/自定义）在列表里。
 */
function getModelOptions(fastMode, stats) {
  let catalogDrivenModelOptions = getCatalogDrivenModelOptions(fastMode, stats);
  let options = catalogDrivenModelOptions ?? getModelOptionsBase(fastMode);
  let h = catalogDrivenModelOptions !== null && isPublishedCatalogActive();
  let ANTHROPIC_CUSTOM_MODEL_OPTION = env.ANTHROPIC_CUSTOM_MODEL_OPTION;
  let w = ANTHROPIC_CUSTOM_MODEL_OPTION
    ? options.findIndex((G) => G.value === ANTHROPIC_CUSTOM_MODEL_OPTION)
    : -1;
  let S = w !== -1 && h && options[w]?.disabled === true && !isFirstPartyApiBackend();
  if (ANTHROPIC_CUSTOM_MODEL_OPTION && (w === -1 || S)) {
    let G = {
      value: ANTHROPIC_CUSTOM_MODEL_OPTION,
      label:
        env.ANTHROPIC_CUSTOM_MODEL_OPTION_NAME ??
        nameForUnnamedModelId(ANTHROPIC_CUSTOM_MODEL_OPTION) ??
        ANTHROPIC_CUSTOM_MODEL_OPTION,
      description:
        env.ANTHROPIC_CUSTOM_MODEL_OPTION_DESCRIPTION ?? `Custom model (${ANTHROPIC_CUSTOM_MODEL_OPTION})`,
      sessionTail: true,
    };
    if (S) options[w] = G;
    else options.push(G);
  }
  let E = catalogDrivenModelOptions === null || h ? getGatewayModelOptions() : [];
  for (let G of E) {
    let options_2 = relabelOptionFromCatalog(G);
    let index = options.findIndex((Z) => optionsMatch(Z, options_2));
    if (index === -1) filterModelOptionsByAllowlist(options, options_2);
    else if (h && options[index]?.disabled === true && options_2.disabled !== true)
      options[index] = options_2;
  }
  let apiProvider = getAPIProvider();
  if (catalogDrivenModelOptions === null && (apiProvider === "firstParty" || apiProvider === "gateway")) {
    let G = apiProvider === "gateway" || isFirstPartyAnthropicBaseUrl();
    for (let q of getAdditionalModelOptionsCache()) {
      let J = appendFableCreditSuffix(q);
      if (J.disabled && !G) continue;
      if (!options.some((Z) => optionsMatch(Z, J))) {
        if (J.disabled === true && stats !== null) stats.disabledReasons.add("server_disabled");
        filterModelOptionsByAllowlist(options, J);
      }
    }
  }
  let L = isPublishedCatalogInUse() ? activeServedCatalog() : null;
  if (
    catalogDrivenModelOptions === null &&
    apiProvider === "firstParty" &&
    (isFableAvailable() ||
      (L !== null &&
        withCatalogSuppressed(isFableAvailable) &&
        getModelUnavailabilityReason("fable")?.reason === "disabled")) &&
    !options.some((G) => typeof G.value === "string" && isFableFamilyValue(G.value))
  )
    filterModelOptionsByAllowlist(options, getFableOption(getDefaultFableModel(), fastMode));
  let { availableModels } = getSettings_DEPRECATED() ?? {};
  if (availableModels)
    for (let availableModel of availableModels) {
      let trimmed = availableModel.trim();
      if (options.some((Q) => Q.value === trimmed)) continue;
      if (trimmed.startsWith("anthropic.")) {
        let Q = nameForUnnamedModelId(trimmed);
        options.push({
          value: trimmed,
          label: Q ?? trimmed,
          description: Q === undefined ? "Custom model" : `Custom model (${trimmed})`,
          sessionTail: true,
        });
        continue;
      }
      let lower = strip1mSuffix(trimmed).toLowerCase();
      if (!usesFirstPartyModelIds() || !/^claude-[a-z0-9-]+$/.test(lower)) continue;
      if (
        !["opus", "sonnet", "haiku"].some((Q) => lower.includes(Q)) &&
        !(apiProvider === "gateway" && isFableModelValue(lower))
      )
        continue;
      if (isModelRemappedOrRetired(trimmed)) continue;
      if (strip1mSuffix(trimmed) !== trimmed) {
        if (
          !(lower.includes("opus")
            ? shouldProbeThirdPartyDefaults()
            : lower.includes("sonnet")
              ? shouldProbeThirdPartyDefaultsAlt()
              : true) ||
          isLegacyNo1mModel(getCanonicalName(lower))
        )
          continue;
      }
      let modelOptionForId = buildModelOptionForId(trimmed);
      if (modelOptionForId !== null && !options.some((Q) => optionsMatch(Q, modelOptionForId)))
        filterModelOptionsByAllowlist(options, {
          ...modelOptionForId,
          sessionTail: true,
        });
    }
  if (L !== null) {
    let G = new Set(
      options.map((q) => (q.value === null ? undefined : findServedModel(parseUserSpecifiedModel(q.value)))),
    );
    for (let q of buildCatalogRows({
      catalog: L,
      provenance: "published",
    })) {
      if (q.row.section === "deprecated" || entryModelKey(q.row.id) !== undefined) continue;
      if (
        (q.family === "fable" && !isFableAvailable()) ||
        options.some(
          (existing) =>
            existing.disabled === true &&
            existing.value !== null &&
            strip1mSuffix(existing.value) === q.family,
        )
      )
        continue;
      let catalogOption = toCatalogOption(q, true, stats);
      if (catalogOption === null) continue;
      if (!G.has(q.row)) {
        options.push(catalogOption);
        continue;
      }
      let Q = catalogOption.value;
      if (Q === null || !isBaseModelKey(Q)) continue;
      let index = options.findIndex(
        (existing) => existing.value !== null && strip1mSuffix(existing.value) === Q,
      );
      if (index !== -1)
        options[index] = {
          value: Q,
          label: capitalize(Q),
          description: `${catalogOption.label} \xB7 ${getFamilySlogan(q.family)}`,
        };
    }
  }
  options = applyCuratedPicker(options, stats);
  let customModel = null;
  let currentMainLoopModel = getUserSpecifiedModelSetting();
  let initialMainLoopModel = getInitialMainLoopModel();
  if (currentMainLoopModel !== undefined && currentMainLoopModel !== null) customModel = currentMainLoopModel;
  else if (initialMainLoopModel !== undefined && initialMainLoopModel !== null)
    customModel = initialMainLoopModel;
  let j = customModel === null ? -1 : options.findIndex((opt) => opt.value === customModel);
  let z = options[j];
  if (
    customModel !== null &&
    z !== undefined &&
    isDisabledCustomModel(z) &&
    getModelUnavailabilityReason(customModel) === null
  )
    options[j] = {
      value: customModel,
      label: z.label,
      description: "Custom model",
      sessionTail: true,
    };
  if (customModel === null || j !== -1) return expandGatewayAliasOptions(options, stats);
  else if (customModel === "opusplan")
    return expandGatewayAliasOptions([...options, getOpusPlanOption()], stats);
  else if (isFableFamilyValue(customModel)) {
    let G = {
      value: customModel,
      label: "",
      description: "",
    };
    let index = options.findIndex((J) => optionsMatch(J, G));
    if (index !== -1)
      options[index] = {
        ...options[index],
        value: customModel,
      };
    else
      filterModelOptionsByAllowlist(options, {
        ...getHaiku35Option(customModel),
        sessionTail: true,
      });
    return expandGatewayAliasOptions(options, stats);
  } else if (customModel === "opus") {
    if (!usesFirstPartyModelIds()) {
      let defaultOpusModel = getDefaultOpusModel();
      return expandGatewayAliasOptions(
        options.map((J) =>
          J.value === defaultOpusModel
            ? {
                ...J,
                value: "opus",
              }
            : J,
        ),
        stats,
      );
    }
    let knownOption = getMaxOpusOption(false);
    return expandGatewayAliasOptions(
      options.some(
        (q) =>
          typeof q.value === "string" && strip1mSuffix(q.value) === q.value && optionsMatch(q, knownOption),
      )
        ? options
        : [
            ...options,
            {
              ...knownOption,
              sessionTail: true,
            },
          ],
      stats,
    );
  } else if (customModel === "opus[1m]" && usesFirstPartyModelIds()) {
    let opus1mDefaultOption = getOpus1mDefaultOption(false);
    return expandGatewayAliasOptions(
      options.some((q) => optionsMatch(q, opus1mDefaultOption))
        ? options
        : [
            ...options,
            {
              ...opus1mDefaultOption,
              sessionTail: true,
            },
          ],
      stats,
    );
  } else {
    let G = {
      value: customModel,
      label: "",
      description: "",
    };
    if (options.some((q) => optionsMatch(q, G))) return expandGatewayAliasOptions(options, stats);
    options.push({
      ...(buildModelOptionForId(customModel) ?? {
        value: customModel,
        label: customModel,
        description: "Custom model",
      }),
      sessionTail: true,
    });
    return expandGatewayAliasOptions(options, stats);
  }
}
//@ chunk-hwmsct5x.js:219700-219894 placement = aliasMatchesParentTier (0.792)
/**
 * 未弃用、被允许、未缺席，别名形式需 1M 可用且不是旧模型。
 */
function isOfferableModel(e) {
  if (
    isModelRemappedOrRetired(e) ||
    !isModelAllowed(e) ||
    getModelUnavailabilityReason(e)?.reason === "absent"
  )
    return false;
  let canonical = strip1mSuffix(e);
  if (canonical === e) return true;
  let canonicalName = getCanonicalName(canonical.toLowerCase());
  return (
    (canonicalName.includes("opus")
      ? shouldProbeThirdPartyDefaults()
      : canonicalName.includes("sonnet")
        ? shouldProbeThirdPartyDefaultsAlt()
        : true) && !isLegacyNo1mModel(canonicalName)
  );
}
//@ chunk-hwmsct5x.js:219894-220643 placement
/**
 * 应用精选模型选择器：去重、过滤不可提供的模型，构建选项（不可用时禁用）；replaceBuiltInOptions 时替换内置选项，否则合并（同模型的可用项替换原项）。
 */
function applyCuratedPicker(options, stats) {
  let curated = getCuratedModelPicker();
  if (!curated) return options;
  let { picker } = curated;
  let isManaged = curated.source === "policySettings";
  let seen = new Set();
  let curatedOptions = [];
  for (let option of picker.options) {
    let trimmed = option.model.trim();
    if (trimmed === "" || seen.has(trimmed) || !isOfferableModel(trimmed)) continue;
    seen.add(trimmed);
    let curatedOption = buildCuratedOption(
      trimmed,
      option.label?.trim() || undefined,
      option.description?.trim() || undefined,
      isManaged,
    );
    let modelUnavailabilityReason = getModelUnavailabilityReason(trimmed);
    if (modelUnavailabilityReason?.reason === "disabled") {
      if (stats !== null) stats.disabledReasons.add("server_disabled");
      curatedOptions.push({
        ...curatedOption,
        disabled: true,
        description: modelUnavailabilityReason.description,
      });
      continue;
    }
    curatedOptions.push(curatedOption);
  }
  if (curatedOptions.length === 0) return options;
  if (stats !== null) {
    stats.curatedRows = curatedOptions.length;
    stats.curatedReplaced = picker.replaceBuiltInOptions === true;
  }
  if (picker.replaceBuiltInOptions === true)
    return [...options.filter((option) => option.value === null), ...curatedOptions];
  let merged = [...options];
  for (let curatedOption of curatedOptions) {
    let index = merged.findIndex((O) => optionsMatch(O, curatedOption));
    let L = merged[index];
    if (L === undefined) merged.push(curatedOption);
    else if (curatedOption.disabled !== true && isDisabledCustomModel(L)) merged[index] = curatedOption;
  }
  return merged;
}
//@ chunk-hwmsct5x.js:220643-220695 placement
function isDisabledCustomModel(e) {
  return e.disabled === true && isPublishedCatalogActive() && !isFirstPartyApiBackend();
}
//@ chunk-hwmsct5x.js:220695-220890 placement
function buildCuratedOption(e, n, r, isManaged) {
  let modelOptionForId = buildModelOptionForId(e);
  let label = n ?? modelOptionForId?.label ?? e;
  let w = r ?? (isManaged ? `Managed by your organization (${e})` : `Custom model (${e})`);
  return {
    value: e,
    label,
    description: w,
    descriptionForModel: r ? `${r} (${e})` : w,
  };
}
//@ chunk-hwmsct5x.js:220890-221057 placement
/**
 * 在选项中找到与给定模型值相同或等价的选项值。
 */
function findMatchingOptionValue(e, n) {
  if (e.some((h) => h.value === n)) return n;
  let r = {
    value: n,
    label: "",
    description: "",
  };
  let found = e.find((h) => optionsMatch(h, r));
  return typeof found?.value === "string" ? found.value : undefined;
}
//@ chunk-hwmsct5x.js:221128-221595 placement
/**
 * 网关环境下把别名型 /model 选项解析成具体模型 id（必要时加 [1m]）；与其他选项重复或不可用时返回 null。
 */
function resolveGatewayAliasOptionModel(e, n, r) {
  if (typeof n.value !== "string") {
    r?.();
    return null;
  }
  let s = strip1mSuffix(n.value);
  if (!isBaseModelKey(s) || !usesFirstPartyModelIds()) {
    r?.();
    return null;
  }
  let h = newestAllowedInFamily(s);
  if (h === null) {
    r?.();
    return null;
  }
  let y = n.value !== s;
  let w =
    s === "opus"
      ? shouldProbeThirdPartyDefaults()
      : s === "sonnet"
        ? shouldProbeThirdPartyDefaultsAlt()
        : true;
  let E = (y || (s === "opus" && opus1mMergeAddsTagTo(h))) && w && eligible1mSuffixTarget(h) ? `${h}[1m]` : h;
  let canonicalName = getCanonicalName(h, {
    identity: true,
  });
  let L = E !== h;
  if (
    e.some(
      (O) =>
        O !== n &&
        O.value !== null &&
        (strip1mSuffix(O.value) !== O.value) === L &&
        getCanonicalName(strip1mSuffix(O.value), {
          identity: true,
        }) === canonicalName &&
        isModelAllowed(O.value),
    )
  )
    return null;
  if (buildModelOptionForId(E) === null) {
    r?.();
    return null;
  }
  return E;
}
//@ chunk-hwmsct5x.js:221595-221838 placement
/**
 * 遍历 /model 选项：网关下别名选项替换成解析出的具体模型选项并去重；非网关原样返回。
 */
function expandGatewayAliasOptions(e, n) {
  if (isModelAllowlistInactive()) return e;
  let modelEntitlementDenySet = getModelEntitlementDenySet();
  let s = new Set();
  return e.flatMap((h) => {
    if (h.value === null || isModelAllowed(h.value)) return [h];
    let y = h.value;
    let gatewayAliasOptionModel = resolveGatewayAliasOptionModel(e, h, () =>
      recordDroppedModelOption(n, y, modelEntitlementDenySet),
    );
    if (gatewayAliasOptionModel === null || s.has(gatewayAliasOptionModel)) return [];
    let modelOptionForId = buildModelOptionForId(gatewayAliasOptionModel);
    if (modelOptionForId === null) return [];
    s.add(gatewayAliasOptionModel);
    return [modelOptionForId];
  });
}
//@ chunk-hwmsct5x.js:222714-223062 placement
/**
 * 判断两个模型选项是否指向同一模型：值相同、Fable 族键相同，或解析后的模型（含规范名回退）相同且 1M 后缀一致。
 */
function optionsMatch(e, n) {
  if (e.value === n.value) return true;
  if (typeof e.value !== "string" || typeof n.value !== "string") return false;
  let fableFamilyKey = getFableFamilyKey(e.value);
  let fableFamilyKey_2 = getFableFamilyKey(n.value);
  if (
    fableFamilyKey !== undefined &&
    fableFamilyKey_2 !== undefined &&
    (fableFamilyKey === fableFamilyKey_2 ||
      fableFamilyKey === FABLE_FAMILY_PREFIX ||
      fableFamilyKey_2 === FABLE_FAMILY_PREFIX)
  )
    return true;
  let userSpecifiedModel = parseUserSpecifiedModel(e.value);
  let userSpecifiedModel_2 = parseUserSpecifiedModel(n.value);
  if (stripAnyVersatileSuffix(userSpecifiedModel) !== stripAnyVersatileSuffix(userSpecifiedModel_2)) {
    let w = usesFirstPartyModelIds() ? undefined : strippedCanonicalName(userSpecifiedModel_2);
    if (!anyModelDescribed(w) || strippedCanonicalName(userSpecifiedModel) !== w) return false;
  }
  return has1mSuffix_2(e.value) === has1mSuffix_2(n.value) || modelHasNative1MContext(userSpecifiedModel);
}
//@ chunk-hwmsct5x.js:223062-223121 placement
/**
 * 判断值是否属于 Fable 族（fable、fable[1m] 或目录中的 Fable id）。
 */
function isFableFamilyValue(e) {
  return e === "fable" || e === "fable[1m]" || isFableModelValue(e);
}
//@ chunk-hwmsct5x.js:223121-223138 placement
var FABLE_FAMILY_PREFIX = "fable:*";
//@ chunk-hwmsct5x.js:223138-223531 placement
/**
 * 取模型值对应的 Fable 族键：fable 别名解析默认 Fable 模型，其他值用目录中 Fable 模型 id 正则匹配。
 */
function getFableFamilyKey(e) {
  if (e === "fable" || e === "fable[1m]") {
    let s = strip1mSuffix(
      getCanonicalName(getDefaultFableModel(), {
        identity: true,
      }),
    );
    return getCatalogEntry(s)?.family === "fable" ||
      anyModelDescribed(s) ||
      (isPublishedCatalogInUse() && getCatalogEntry(s) === undefined && findServedModel(s) !== undefined)
      ? s
      : FABLE_FAMILY_PREFIX;
  }
  let sorted = getModelCatalog()
    .models.filter((model) => model.family === "fable")
    .map((model) => model.id)
    .sort((s, h) => h.length - s.length);
  return new RegExp(
    `(?:^|[./])(${sorted.join("|")})(?:[-@]\\d{8})?(?:-v\\d+(?::\\d+)?)?(?:\\[[12]m\\])?$`,
    "i",
  )
    .exec(e)?.[1]
    ?.toLowerCase();
}
//@ chunk-hwmsct5x.js:223531-223942 placement
/**
 * 对需要额外用量额度的 Fable 选项标记为禁用并加"requires usage credits"说明（按计费模式判断），记录禁用原因。
 */
function markFableCreditRequired(e, n) {
  if (!saffronPickerDimOn() || isConsumerPlan() || !isExtraUsageOrgDisabled()) return e;
  return e.map((r) => {
    if (r.disabled === true || typeof r.value !== "string" || !isFableFamilyValue(r.value)) return r;
    let userSpecifiedModel = parseUserSpecifiedModel(r.value);
    let h = usageCreditsBillingState(userSpecifiedModel);
    if (h === "pay_per_request" || h === "included_in_plan") return r;
    let y = isUsageCreditsModelBilled(userSpecifiedModel) ? "" : " \u2014 requires usage credits";
    if (n !== null) n.disabledReasons.add("credits_required");
    return {
      ...r,
      disabled: true,
      label: "Fable (disabled)",
      description: `${r.description}${y}`,
    };
  });
}
//@ chunk-hwmsct5x.js:223942-224874 callgraph-witnessed = filterModelOptionsByAllowlist (0.39)
/**
 * 插入 Fable 等“置顶族”行：放在 Default 之后、与默认模型同族的行后面。
 */
function filterModelOptionsByAllowlist(e, n) {
  if (!(typeof n.value === "string" && isFableFamilyValue(n.value))) {
    e.push(n);
    return;
  }
  let index = e.findIndex((H) => H.value === null);
  if (index === -1) {
    e.splice(0, 0, n);
    return;
  }
  let modelFamilyFromString = getModelFamilyFromString(getDefaultMainLoopModel());
  let h = e[index + 1]?.value;
  let y = e[index + 1];
  let w = typeof h === "string" && y !== undefined ? resolveGatewayAliasOptionModel(e, y) : null;
  let S = (H) =>
    w !== null &&
    getCanonicalName(strip1mSuffix(H), {
      identity: true,
    }) ===
      getCanonicalName(strip1mSuffix(w), {
        identity: true,
      }) &&
    (strip1mSuffix(H) !== H) === (strip1mSuffix(w) !== w) &&
    isModelAllowed(H);
  let E = getUserSpecifiedModelSetting() ?? getInitialMainLoopModel() ?? null;
  let R =
    (typeof E === "string" && S(E)) ||
    (getSettings_DEPRECATED()?.availableModels ?? []).some((opt) => S(opt.trim())) ||
    getGatewayModelOptions().some((H) => typeof H.value === "string" && S(H.value)) ||
    getAdditionalModelOptionsCache().some((H) => typeof H.value === "string" && S(H.value)) ||
    (getCuratedModelPicker()?.picker.options ?? []).some((H) => S(H.model.trim()));
  let L = typeof h === "string" && (isModelAllowlistInactive() || isModelAllowed(h) || (w !== null && !R));
  let O = typeof h === "string" && isBaseModelKey(strip1mSuffix(h)) ? getModelFamilyFromString(h) : null;
  let M = new Set();
  if (O !== null) {
    M.add(O);
    if (!L && modelFamilyFromString !== null) M.add(modelFamilyFromString);
  } else if (modelFamilyFromString !== null) M.add(modelFamilyFromString);
  let P = index + 1;
  while (P < e.length) {
    let H = e[P]?.value;
    if (typeof H !== "string") break;
    let modelFamilyFromString = getModelFamilyFromString(H);
    if ((modelFamilyFromString !== null && M.has(modelFamilyFromString)) || isFableFamilyValue(H)) P++;
    else break;
  }
  e.splice(P, 0, n);
}
//@ chunk-hwmsct5x.js:224874-225071 affinity = aliasMatchesParentTier (0.852)
/**
 * 字符串里的族名（fable/opus/sonnet/haiku），没有为 null。
 */
function getModelFamilyFromString(e) {
  let canonical = e.toLowerCase();
  if (canonical.includes("fable")) return "fable";
  if (canonical.includes("opus")) return "opus";
  if (canonical.includes("sonnet")) return "sonnet";
  if (canonical.includes("haiku")) return "haiku";
  return null;
}
//@ chunk-aepeg2w5.js:438212-438266 fingerprint = getSonnet46Option (0.561)
/**
 * 当前提供商 catalog sonnet 档的模型字符串，缺失时 sonnet46。旧版名 getSonnet46Option 为错配（不是选项）。
 */
function getDefaultSonnetBuiltin(rawModelStrings = getModelStrings()) {
  return catalogFamilyDefaultKey("sonnet", rawModelStrings) ?? rawModelStrings.sonnet46;
}
//@ chunk-d1cgs5na.js:12554-12651 fingerprint = getModelFamilyInfo (0.437)
/**
 * sonnet-4-5、sonnet-4-0、3-7、3-5 的规范名集合。旧版名 getModelFamilyInfo 为错配。
 */
var LEGACY_SONNET_MODELS = new Set([
  "claude-sonnet-4-5",
  "claude-sonnet-4-0",
  "claude-3-7-sonnet",
  "claude-3-5-sonnet",
]);
export {
  getDefaultSonnetBuiltin,
  buildModelPickerOptions,
  getEnabledModelOptions,
  getUnavailableModelOptions,
  getModelOptionsWithTelemetry,
  findMatchingOptionValue,
  noopModelOption,
  getUnavailableModelRows,
  LEGACY_SONNET_MODELS,
  isOfferableModel,
  isFableFamilyValue,
};
