/**
 * utils/model/modelOptions.ts
 *
 * /model 选择器选项：Default（推荐）、各族（Fable/Opus/Sonnet/Haiku）与 1M 变体、Opus Plan、自定义模型（ANTHROPIC_CUSTOM_MODEL_OPTION、ANTHROPIC_DEFAULT_*_MODEL），按订阅类型/提供商/白名单组合与过滤。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/model/modelOptions.ts
 * pieces: chunk-aepeg2w5.js (1), chunk-d1cgs5na.js (1), chunk-hwmsct5x.js (79)
 * attribution: fingerprint 17, placement 46, layout 13, callgraph-fingerprint 1, callgraph-witnessed 3, affinity 1
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
  uto,
  servedCatalogSource,
  Vte,
  isPublishedCatalogActive,
  Yte,
} from "./modelCatalog/servedCatalog.js";
import { modelHasNative1MContext, has1mSuffix, isLegacyNo1mModel } from "./contextWindow1m.js";
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
import { getModelCatalog, getCatalogEntry, No, WK } from "./modelCatalog.js";
import { LEGACY_MODEL_IDS, Bn, Lt, I_ } from "./modelIds.js";
import { MODEL_KEY_BY_FIRST_PARTY_ID, CLAUDE_FABLE_5_CONFIG, CLAUDE_FABLE_5_1_CONFIG } from "./configs.js";
import { getCanonicalName, strippedCanonicalName } from "./canonicalModelName.js";
import { env } from "../env.js";
import {
  SONNET_SLOGAN,
  OPUS_SLOGAN,
  FABLE_SLOGAN,
  HAIKU_SLOGAN,
  buildCatalogRows,
  oc,
} from "./modelErrorOverrides.js";
import { getModelStrings, isModelAvailableOnProvider, resolveProviderModelId } from "./modelStrings.js";
import {
  D2,
  isUsageCreditsModelBilled,
  Cd,
  isConsumerPlan,
  isExtraUsageOrgDisabled,
  usageCreditsBillingState,
} from "../planTiers.js";
import { findModelConfigById } from "./providerCaches.js";
import {
  anyModelDescribed,
  Cxt,
  Rxt,
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
  isModelAllowlistInactive,
} from "./modelAllowlist.js";
import { qto, getGatewayModelOptions } from "../../services/gateway/gatewayDiscovery.js";
import { count } from "../collections.js";
import { logFeatureSad, logFeatureOk, logFeatureBad } from "../../services/analytics/featureTelemetry.js";
import { logForDebugging } from "../debug.js";
import { normalizeModelId } from "./modelCatalog/catalogEntries.js";
import { markdownSafeText, sanitizeTitle } from "../resultError.js";
import { getModelUnavailabilityReason, ju } from "./classifierModel.js";
import { getSettings_DEPRECATED } from "../settings/settings.js";
import { isModelRemappedOrRetired } from "./deprecation.js";
import { capitalize } from "../stringUtils.js";
import { getUserSpecifiedModelSetting } from "./smallFastModel.js";
import { getInitialMainLoopModel } from "../../bootstrap/state.js";
import {
  expandGatewayAliasOptions,
  resolveGatewayAliasOptionModel,
} from "./_new/resolveGatewayAliasOptionModel.js";

/**
 * 默认模型说明里的来源后缀（托管 enforced 等）。
 */
//@ chunk-hwmsct5x.js:199615-199672 placement
function getDefaultAttributionSuffix(e) {
  return defaultModelAttributionSuffix(e !== "env" && isDefaultModelEnforced() ? "enforced" : e);
}
/**
 * Default 选项：订阅用户 "Default (recommended)" 描述当前默认；否则 "Default"/"(recommended)" 加 "Use the default model (currently …)" 与来源后缀。
 */
//@ chunk-hwmsct5x.js:199672-200008 fingerprint = getDefaultOptionForUser (0.434)
function getDefaultOptionForUser(fastMode) {
  if (isClaudeAISubscriber())
    return {
      value: null,
      label: "Default (recommended)",
      description: getClaudeAiUserDefaultModelDescription(fastMode),
    };
  let { setting: setting, attribution: attribution } = resolveDefaultMainLoopModelSetting(),
    s = !usesFirstPartyModelIds(),
    h = isFastModeOnForModel(fastMode, setting) && supportsFastMode(setting),
    y =
      attribution === "tier" || (attribution === "served" && isPublishedCatalogInUse())
        ? getModelPriceSuffix(h ? setting : parseUserSpecifiedModel(setting), h)
        : "";
  return {
    value: null,
    label: s ? "Default" : "Default (recommended)",
    description: `Use the default model (currently ${renderDefaultModelSetting(setting)})${y}${getDefaultAttributionSuffix(attribution)}`,
  };
}
/**
 * 非第一方类、anthropicAws/GoogleCloud 或非直连 api.anthropic.com 时允许 ANTHROPIC_DEFAULT_*_MODEL 自定义行。
 */
//@ chunk-hwmsct5x.js:200008-200047 placement
function allowsCustomTierOptions() {
  return !usesFirstPartyModelIds() || isClaudePlatformProvider() || !isFirstPartyAnthropicBaseUrl();
}
/**
 * 默认 Opus 原生 1M。
 */
//@ chunk-hwmsct5x.js:200047-200077 placement
function isDefaultOpusNative1m() {
  return modelHasNative1MContext(getDefaultOpusModel());
}
//@ chunk-hwmsct5x.js:200077-200107 placement
function Qa() {
  return modelHasNative1MContext(getDefaultSonnetModel());
}
/**
 * 读取内置目录中某族最新模型（latest_per_family），返回 {id, displayName, key}；目录不一致时抛错。
 */
//@ chunk-hwmsct5x.js:200107-200437 placement
function getLatestFamilyModel(e) {
  let n = getModelCatalog().latest_per_family[e],
    found = LEGACY_MODEL_IDS.find((y) => y === n),
    s = found && getCatalogEntry(found),
    h = s && MODEL_KEY_BY_FIRST_PARTY_ID[s.provider_ids.first_party];
  if (found === void 0 || s === void 0 || h === void 0)
    throw Error(
      "model-catalog.json: latest_per_family must name a models[] entry that has a CATALOG_ID_TO_KEY line in configs.ts",
    );
  return { id: found, displayName: s.display_name, key: h };
}
/**
 * 该档当前主模型就是 catalog 的该档模型。
 */
//@ chunk-hwmsct5x.js:200502-200545 placement
function isTierDefaultCatalogModel(e) {
  return getCanonicalName(getDefaultModelForFamily(e)) === getLatestFamilyModel(e).id;
}
/**
 * 自定义档位模型的 label/description（ANTHROPIC_DEFAULT_*_MODEL_NAME/DESCRIPTION 优先）。
 */
//@ chunk-hwmsct5x.js:200545-200753 layout
function buildCustomTierLabel(e, n, r, s) {
  let h = r === void 0 ? nameForUnnamedModelId(e) : void 0,
    y = (n === "Sonnet" || n === "Opus") && has1mSuffix(e);
  return {
    label: r ?? h ?? e,
    description:
      s ?? (h !== void 0 ? `Custom ${n} model (${e})` : `Custom ${n} model${y ? " (1M context)" : ""}`),
  };
}
/**
 * ANTHROPIC_DEFAULT_SONNET_MODEL 设置且允许自定义行时的 Sonnet 选项（value "sonnet"）。
 */
//@ chunk-hwmsct5x.js:200753-201081 fingerprint = getCustomSonnetOption (0.796)
function getCustomSonnetOption() {
  let customSonnetModel = env.ANTHROPIC_DEFAULT_SONNET_MODEL;
  if (allowsCustomTierOptions() && customSonnetModel) {
    let is1m = has1mSuffix(customSonnetModel);
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
/**
 * 选项描述里的价格后缀（fast mode 时用 fast 价）。
 */
//@ chunk-hwmsct5x.js:201081-201121 layout
function getModelPriceSuffix(e, n) {
  return getModelPricingSuffix(isFastModeOnForModel(n, e), e);
}
/**
 * /model 选项中 Sonnet/Opus/Fable 的展示信息：标签、标语、给模型看的描述与价格后缀函数。
 */
//@ chunk-hwmsct5x.js:201121-201495 placement
var FAMILY_PRESENTATION = {
  sonnet: {
    label: "Sonnet",
    slogan: SONNET_SLOGAN,
    descriptionForModel: "efficient for routine tasks. Generally recommended for most coding tasks",
    suffix: (e) => getModelPriceSuffix(e, !1),
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
    suffix: bi,
  },
};
/**
 * 生成模型选择器中某个模型选项：value、label、显示描述与给模型看的描述。旧版名 generateModelSection 来自 ConfigTool/prompt，实际属于模型选项。
 */
//@ chunk-hwmsct5x.js:201495-201735 placement = generateModelSection (0.417)
function generateModelSection(e, n = !1) {
  let { id: id, displayName: displayName, key: key } = getLatestFamilyModel(e),
    y = FAMILY_PRESENTATION[e],
    w = usesFirstPartyModelIds() && isTierDefaultCatalogModel(e) ? e : getModelStrings()[key],
    S = w === e ? getDefaultModelForFamily(e) : id;
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
var ol = " \xB7 Requires usage credits";
//@ chunk-hwmsct5x.js:202428-202473 placement
function bi(e) {
  return !D2() && isUsageCreditsModelBilled(parseUserSpecifiedModel(e)) ? ol : "";
}
//@ chunk-hwmsct5x.js:202473-202766 placement
function appendFableCreditSuffix(e) {
  if (e.disabled === !0 || typeof e.value !== "string") return e;
  let n = findModelConfigById(Bn(e.value));
  if (!(
    e.value === "fable" ||
    e.value === "fable[1m]" ||
    n === CLAUDE_FABLE_5_CONFIG ||
    n === CLAUDE_FABLE_5_1_CONFIG
  ))
    return e;
  let s = e.description.endsWith(ol) ? e.description.slice(0, -ol.length) : e.description;
  return { ...e, description: `${s}${bi(e.value)}` };
}
//@ chunk-hwmsct5x.js:202766-203001 placement
function getFableOption(e, n) {
  let r = _c(e) ?? getLatestFamilyModel("fable").displayName,
    s = isClaudeAISubscriber() ? "" : getModelPriceSuffix(e, n);
  return {
    value: "fable",
    label: "Fable",
    description: `${r} \xB7 ${FABLE_SLOGAN}${s}${bi(e)}`,
    descriptionForModel: `${r} - most capable for your hardest and longest-running tasks`,
  };
}
//@ chunk-hwmsct5x.js:203001-203248 placement
function getHaiku35Option(e) {
  let n = _c(e) ?? (anyModelDescribed(e, strippedCanonicalName(e)) ? renderModelName(e) : void 0);
  if (n === void 0) return { ...generateModelSection("fable"), value: e };
  return {
    value: e,
    label: n,
    description: `${n} \xB7 ${FABLE_SLOGAN}${bi(e)}`,
    descriptionForModel: `${n} - most capable for your hardest and longest-running tasks`,
  };
}
//@ chunk-hwmsct5x.js:203248-203346 placement
function _c(e) {
  let n = getCatalogEntry(Lt(getCanonicalName(e, { identity: !0 })));
  return n?.family === "fable" ? n.display_name : void 0;
}
/**
 * ANTHROPIC_DEFAULT_OPUS_MODEL 对应的自定义 Opus 选项。
 */
//@ chunk-hwmsct5x.js:203346-203660 fingerprint = getCustomOpusOption (0.793)
function getCustomOpusOption() {
  let customOpusModel = env.ANTHROPIC_DEFAULT_OPUS_MODEL;
  if (allowsCustomTierOptions() && customOpusModel) {
    let is1m = has1mSuffix(customOpusModel);
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
/**
 * "Opus 4.1 · Legacy" 选项。
 */
//@ chunk-hwmsct5x.js:203660-203800 fingerprint = getOpus41Option (0.855)
function getOpus41Option() {
  return {
    value: getModelStrings().opus41,
    label: "Opus 4.1",
    description: "Opus 4.1 \xB7 Legacy",
    descriptionForModel: "Opus 4.1 - legacy version",
  };
}
/**
 * /model 选项 "Opus 4.6 · Legacy"。旧版名 FAST_MODE_MODEL_DISPLAY 为错配，应归 utils/model/modelOptions.ts。
 */
//@ chunk-hwmsct5x.js:203800-203971 placement = FAST_MODE_MODEL_DISPLAY (0.334)
function getOpus46Option() {
  return {
    value: !usesFirstPartyModelIds() ? getModelStrings().opus46 : "claude-opus-4-6",
    label: "Opus 4.6",
    description: "Opus 4.6 \xB7 Legacy",
    descriptionForModel: "Opus 4.6 - previous Opus version",
  };
}
/**
 * /model 选项：Opus 4.7（Legacy）。
 */
//@ chunk-hwmsct5x.js:203971-204142 layout
function getOpus47Option() {
  return {
    value: !usesFirstPartyModelIds() ? getModelStrings().opus47 : "claude-opus-4-7",
    label: "Opus 4.7",
    description: "Opus 4.7 \xB7 Legacy",
    descriptionForModel: "Opus 4.7 - previous Opus version",
  };
}
/**
 * /model 选项：Opus 4.8（Legacy）。
 */
//@ chunk-hwmsct5x.js:204142-204313 layout
function getOpus48Option() {
  return {
    value: !usesFirstPartyModelIds() ? getModelStrings().opus48 : "claude-opus-4-8",
    label: "Opus 4.8",
    description: "Opus 4.8 \xB7 Legacy",
    descriptionForModel: "Opus 4.8 - previous Opus version",
  };
}
/**
 * /model 选项：Opus 5（上一代 Opus）。
 */
//@ chunk-hwmsct5x.js:204313-204490 layout
function getOpus5Option() {
  return {
    value: !usesFirstPartyModelIds() ? getModelStrings().opus5 : "claude-opus-5",
    label: "Opus 5",
    description: "Opus 5 \xB7 Previous Opus version",
    descriptionForModel: "Opus 5 - previous Opus version",
  };
}
/**
 * "Sonnet 4.6 (1M context)" 选项。
 */
//@ chunk-hwmsct5x.js:204490-204770 fingerprint = getSonnet46_1MOption (0.643)
function getSonnet46_1MOption() {
  return {
    value: !usesFirstPartyModelIds() ? getModelStrings().sonnet46 + "[1m]" : "claude-sonnet-4-6[1m]",
    label: "Sonnet 4.6 (1M context)",
    description: `Sonnet 4.6 for long sessions${getModelPriceSuffix("claude-sonnet-4-6", !1)}`,
    descriptionForModel: "Sonnet 4.6 with 1M context window - for long sessions with large codebases",
  };
}
/**
 * "<Sonnet> (1M context)" 选项（sonnet[1m]）。
 */
//@ chunk-hwmsct5x.js:204770-205080 layout
function getSonnet1mOption() {
  let { id: id, displayName: displayName } = getLatestFamilyModel("sonnet"),
    r = {
      value: "sonnet[1m]",
      label: `${displayName} (1M context)`,
      descriptionForModel: `${displayName} with 1M context window - for long sessions with large codebases`,
    };
  if (isClaudeAISubscriber()) return { ...r, description: `${displayName} for long sessions` };
  return { ...r, description: `${displayName} for long sessions${getModelPriceSuffix(id, !1)}` };
}
/**
 * "Opus 4.6 (1M context)" 选项。
 */
//@ chunk-hwmsct5x.js:205080-205361 fingerprint = getOpus46_1MOption (0.594)
function getOpus46_1MOption(e = !1, n = !0) {
  return {
    value: !usesFirstPartyModelIds() ? getModelStrings().opus46 + "[1m]" : "claude-opus-4-6[1m]",
    label: "Opus 4.6 (1M context)",
    description: `Opus 4.6 for long sessions${n ? getModelPriceSuffix("claude-opus-4-6", e) : ""}`,
    descriptionForModel: "Opus 4.6 with 1M context window - for long sessions with large codebases",
  };
}
/**
 * 合并后的 "Opus (1M context)" 选项（opus[1m] 或当前提供商的 Opus 字符串 + [1m]）。
 */
//@ chunk-hwmsct5x.js:205361-205635 fingerprint = getMergedOpus1MOption (0.597)
function getMergedOpus1MOption(fastMode = !1) {
  let n = !usesFirstPartyModelIds(),
    { id: id, displayName: displayName, key: key } = getLatestFamilyModel("opus");
  return {
    value: n ? getModelStrings()[key] + "[1m]" : "opus[1m]",
    label: "Opus (1M context)",
    description: `${displayName} for long sessions${getModelPriceSuffix(id, fastMode)}`,
    descriptionForModel: `${displayName} with 1M context window - for long sessions with large codebases`,
  };
}
/**
 * ANTHROPIC_DEFAULT_HAIKU_MODEL 对应的自定义 Haiku 选项。
 */
//@ chunk-hwmsct5x.js:205635-205916 fingerprint = getCustomHaikuOption (0.837)
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
/**
 * Haiku 选项（"<Haiku 显示名> · Fastest for quick answers"）。
 */
//@ chunk-hwmsct5x.js:205916-206132 fingerprint = getHaiku45Option (0.707)
function getHaiku45Option() {
  let e = getDefaultHaikuModel(),
    n = getPublicModelDisplayName(e) ?? "Haiku";
  return {
    value: "haiku",
    label: "Haiku",
    description: `${n} \xB7 ${HAIKU_SLOGAN}${getModelPriceSuffix(e, !1)}`,
    descriptionForModel: `${n} - fastest for quick answers. Lower cost but less capable than Sonnet.`,
  };
}
/**
 * Pro 订阅且 tengu_gypsum_kite 时提示 "~2× usage vs Sonnet"。
 */
//@ chunk-hwmsct5x.js:206132-206235 layout
function getProUsageMultiplierNote() {
  if (getSubscriptionType() === "pro" && getFeatureValue_CACHED_MAY_BE_STALE("tengu_gypsum_kite", !1))
    return " \xB7 ~2\xD7 usage vs Sonnet";
  return "";
}
/**
 * 订阅用户的 Opus 选项（可附 Pro 用量提示）。
 */
//@ chunk-hwmsct5x.js:206235-206379 fingerprint = getMaxOpusOption (0.899)
function getMaxOpusOption(fastMode = !1) {
  let { id: id, displayName: displayName } = getLatestFamilyModel("opus"),
    s = fastMode ? getModelPriceSuffix(id, !1) : "";
  return {
    value: "opus",
    label: "Opus",
    description: `${displayName} \xB7 ${OPUS_SLOGAN}${getProUsageMultiplierNote()}${s}`,
  };
}
/**
 * 订阅用户的 "Sonnet 4.6 (1M context)"（可能注明耗用 usage credits）。
 */
//@ chunk-hwmsct5x.js:206379-206629 callgraph-fingerprint = getMaxSonnet46_1MOption (0.248)
function getMaxSonnet46_1MOption() {
  let e = !usesFirstPartyModelIds(),
    n = isClaudeAISubscriber() ? " \xB7 Draws from usage credits" : "",
    r = n === "" ? "" : getModelPriceSuffix("claude-sonnet-4-6", !1);
  return {
    value: e ? getModelStrings().sonnet46 + "[1m]" : "claude-sonnet-4-6[1m]",
    label: "Sonnet 4.6 (1M context)",
    description: `Sonnet 4.6 with 1M context${n}${r}`,
  };
}
/**
 * 订阅用户的 "Opus (1M context)"。
 */
//@ chunk-hwmsct5x.js:206629-206844 fingerprint = getMaxOpus46_1MOption (0.551)
function getMaxOpus46_1MOption() {
  let e = isClaudeAISubscriber() ? " \xB7 Draws from usage credits" : "",
    { id: id, displayName: displayName } = getLatestFamilyModel("opus"),
    s = e === "" ? "" : getModelPriceSuffix(id, !1);
  return {
    value: "opus[1m]",
    label: "Opus (1M context)",
    description: `${displayName} with 1M context${getProUsageMultiplierNote()}${e}${s}`,
  };
}
/**
 * 默认 Opus 走 1M 时的 "Opus (1M context)" 选项。旧版名 getOpus46Option 不准确。
 */
//@ chunk-hwmsct5x.js:206844-207137 callgraph-witnessed = getOpus46Option (0.392)
function getOpus1mDefaultOption(e = !1, n = !1) {
  let r = !usesFirstPartyModelIds(),
    s = getDefaultOpusModel(),
    h = getMarketingNameForModel(Bn(s)) ?? "Opus",
    y = e ? getModelPriceSuffix(s, n) : "";
  return {
    value: r ? getModelStrings()[getLatestFamilyModel("opus").key] + "[1m]" : "opus[1m]",
    label: "Opus (1M context)",
    description: `${h} with 1M context \xB7 ${OPUS_SLOGAN}${getProUsageMultiplierNote()}${y}`,
    descriptionForModel: `${h} with 1M context - best for everyday, complex tasks`,
  };
}
/**
 * 订阅用户的 Sonnet 选项。
 */
//@ chunk-hwmsct5x.js:207137-207240 fingerprint = MaxSonnet46Option (1)
function MaxSonnet46Option() {
  return {
    value: "sonnet",
    label: "Sonnet",
    description: `${getMarketingNameForModel(Bn(getDefaultSonnetModel())) ?? "Sonnet"} \xB7 ${SONNET_SLOGAN}`,
  };
}
/**
 * 订阅用户的 Haiku 选项。
 */
//@ chunk-hwmsct5x.js:207240-207336 fingerprint = MaxHaiku45Option (1)
function MaxHaiku45Option() {
  return {
    value: "haiku",
    label: "Haiku",
    description: `${getPublicModelDisplayName(getDefaultHaikuModel()) ?? "Haiku"} \xB7 ${HAIKU_SLOGAN}`,
  };
}
/**
 * "Opus Plan Mode"：plan 模式用 Opus，其余用 Sonnet（opusplan）。
 */
//@ chunk-hwmsct5x.js:207336-207452 fingerprint = getOpusPlanOption (0.779)
function getOpusPlanOption() {
  return {
    value: "opusplan",
    label: "Opus Plan Mode",
    description: "Use Opus in plan mode, Sonnet otherwise",
  };
}
/**
 * 空实现（构建裁剪掉的选项钩子）。
 */
//@ chunk-hwmsct5x.js:207452-207475 layout
function noopModelOption(e) {
  return;
}
/**
 * 在选项列表里补上默认模型所在族与指定族的行。
 */
//@ chunk-hwmsct5x.js:207475-207589 layout = aliasMatchesParentTier (0.792)
function ensureFamilyOptionRows(e, n, r) {
  let canonical = getModelFamilyFromString(getDefaultMainLoopModelSetting()),
    h = (canonical === "opus" || canonical === "sonnet") && canonical !== r ? [canonical, r] : [r];
  for (let y of h) ensureTierOptionPresent(e, y, n);
  return e;
}
/**
 * /model 选项列表里没有 sonnet/opus（含 opus[1m]）时插入对应默认选项（放在“默认”项之后）。
 */
//@ chunk-hwmsct5x.js:207589-207771 layout
function ensureTierOptionPresent(e, n, r) {
  let s = n === "opus" && opus1mMergeTagsDefaultOpus();
  if (e.some((y) => y.value === n || (s && y.value === `${n}[1m]`))) return;
  let h = n === "sonnet" ? getSonnetOption() : getOpusOption(r);
  e.splice(e.findIndex((y) => y.value === null) + 1, 0, h);
}
/**
 * Sonnet 选项（catalog 默认时可能用精简行）。
 */
//@ chunk-hwmsct5x.js:207771-208021 layout
function getSonnetOption(e = !1) {
  let n = isClaudeAISubscriber();
  if (isTierDefaultCatalogModel("sonnet")) return n ? MaxSonnet46Option() : generateModelSection("sonnet");
  let r = getDefaultSonnetModel(),
    s = getMarketingNameForModel(Bn(r)) ?? "Sonnet",
    h = e ? getModelPriceSuffix(r, !1) : "";
  return {
    value: "sonnet",
    label: "Sonnet",
    description: `${s} \xB7 ${SONNET_SLOGAN}${h}`,
    descriptionForModel: `${s} - efficient for routine tasks`,
  };
}
/**
 * Opus 选项；默认 Opus 1M optIn 时返回 "Opus (1M context)"。auto 名 getHaiku35Option 为错配。
 */
//@ chunk-hwmsct5x.js:208021-208291 layout
function getOpusOption(e) {
  let n = isClaudeAISubscriber();
  if (opus1mMergeTagsDefaultOpus()) return getOpus1mDefaultOption(!n, e);
  if (isTierDefaultCatalogModel("opus")) return n ? getMaxOpusOption(!1) : generateModelSection("opus", e);
  let r = getDefaultOpusModel(),
    s = getMarketingNameForModel(Bn(r)) ?? "Opus",
    h = n ? "" : getModelPriceSuffix(r, e);
  return {
    value: "opus",
    label: "Opus",
    description: `${s} \xB7 ${OPUS_SLOGAN}${h}`,
    descriptionForModel: `${s} - best for everyday, complex tasks`,
  };
}
/**
 * 内置选项列表：订阅用户（有 Opus 权限/无）、第一方类提供商、第三方提供商三套组合，按可用性加入各族及 1M 变体与自定义档位行。
 */
//@ chunk-hwmsct5x.js:208291-209773 callgraph-witnessed = getModelOptionsBase (0)
function getModelOptionsBase(fastMode = !1) {
  if (isClaudeAISubscriber()) {
    if (isOpusDefaultSubscriber()) {
      let premiumOptions = [getDefaultOptionForUser(fastMode)];
      if (!isOpus1mMergeEnabled() && shouldProbeThirdPartyDefaults() && !isDefaultOpusNative1m())
        premiumOptions.push(getMaxOpus46_1MOption());
      if ((premiumOptions.push(MaxSonnet46Option()), shouldProbeThirdPartyDefaultsAlt() && !Qa()))
        premiumOptions.push(
          isTierDefaultCatalogModel("sonnet") ? getSonnet1mOption() : getMaxSonnet46_1MOption(),
        );
      return (
        premiumOptions.push(MaxHaiku45Option()),
        ensureFamilyOptionRows(premiumOptions, fastMode, "opus")
      );
    }
    let standardOptions = [getDefaultOptionForUser(fastMode)];
    if (shouldProbeThirdPartyDefaultsAlt() && !Qa())
      standardOptions.push(
        isTierDefaultCatalogModel("sonnet") ? getSonnet1mOption() : getMaxSonnet46_1MOption(),
      );
    if (opus1mMergeTagsDefaultOpus()) standardOptions.push(getOpus1mDefaultOption());
    else if (
      (standardOptions.push(getMaxOpusOption(!1)),
      shouldProbeThirdPartyDefaults() && !isDefaultOpusNative1m())
    )
      standardOptions.push(getMaxOpus46_1MOption());
    return (
      standardOptions.push(MaxHaiku45Option()),
      ensureFamilyOptionRows(standardOptions, fastMode, "sonnet")
    );
  }
  if (usesFirstPartyModelIds()) {
    let payg1POptions = [getDefaultOptionForUser(fastMode)],
      S = getCustomOpusOption();
    if (S !== void 0) payg1POptions.push(S);
    else if (
      !isOpus1mMergeEnabled() &&
      shouldProbeThirdPartyDefaults() &&
      !isDefaultOpusNative1m() &&
      !isPublishedCatalogInUse()
    )
      payg1POptions.push(getMergedOpus1MOption(fastMode));
    let E = getCustomSonnetOption();
    if (E !== void 0) payg1POptions.push(E);
    else if (isTierDefaultCatalogModel("sonnet")) {
      if ((payg1POptions.push(generateModelSection("sonnet")), shouldProbeThirdPartyDefaultsAlt() && !Qa()))
        payg1POptions.push(getSonnet1mOption());
    } else if (isPublishedCatalogInUse() && withCatalogSuppressed(() => isTierDefaultCatalogModel("sonnet")))
      payg1POptions.push(getSonnetOption(!0));
    else {
      if (isModelAvailableOnProvider(getLatestFamilyModel("sonnet").key))
        payg1POptions.push(generateModelSection("sonnet"));
      if (isModelAvailableOnProvider("sonnet5")) payg1POptions.push(getSonnet5Option());
      if ((payg1POptions.push(getSonnet46Option()), shouldProbeThirdPartyDefaultsAlt()))
        payg1POptions.push(getSonnet46_1MOption());
    }
    payg1POptions.push(getCustomHaikuOption() ?? getHaiku45Option());
    let R = getCustomFableOption();
    if (R !== void 0) filterModelOptionsByAllowlist(payg1POptions, R);
    else if (isClaudePlatformProvider() && isModelAvailableOnProvider(getLatestFamilyModel("fable").key))
      filterModelOptionsByAllowlist(payg1POptions, generateModelSection("fable"));
    return ensureFamilyOptionRows(payg1POptions, fastMode, "opus");
  }
  let payg3pOptions = [getDefaultOptionForUser(fastMode)],
    customSonnet = getCustomSonnetOption();
  if (customSonnet !== void 0) payg3pOptions.push(customSonnet);
  else {
    if (isModelAvailableOnProvider(getLatestFamilyModel("sonnet").key))
      payg3pOptions.push(generateModelSection("sonnet"));
    if (isModelAvailableOnProvider("sonnet5")) payg3pOptions.push(getSonnet5Option());
    if (isModelAvailableOnProvider("sonnet46")) {
      if ((payg3pOptions.push(getSonnet46Option()), shouldProbeThirdPartyDefaultsAlt()))
        payg3pOptions.push(getSonnet46_1MOption());
    }
  }
  let customOpus = getCustomOpusOption();
  if (customOpus !== void 0) payg3pOptions.push(customOpus);
  else {
    if (isModelAvailableOnProvider("opus41")) payg3pOptions.push(getOpus41Option());
    let key = getLatestFamilyModel("opus").key;
    if (isModelAvailableOnProvider(key)) {
      if (
        (payg3pOptions.push(generateModelSection("opus")),
        shouldProbeThirdPartyDefaults() && !modelHasNative1MContext(getModelStrings()[key]))
      )
        payg3pOptions.push(getMergedOpus1MOption());
    }
    if (isModelAvailableOnProvider("opus5")) payg3pOptions.push(getOpus5Option());
    if (isModelAvailableOnProvider("opus48")) payg3pOptions.push(getOpus48Option());
    if (isModelAvailableOnProvider("opus47")) payg3pOptions.push(getOpus47Option());
    if (isModelAvailableOnProvider("opus46")) {
      if ((payg3pOptions.push(getOpus46Option()), shouldProbeThirdPartyDefaults()))
        payg3pOptions.push(getOpus46_1MOption(fastMode));
    }
  }
  let customHaiku = getCustomHaikuOption();
  if (customHaiku !== void 0) payg3pOptions.push(customHaiku);
  else if (isModelAvailableOnProvider("haiku45") || isModelAvailableOnProvider("haiku35"))
    payg3pOptions.push(getHaiku45Option());
  let y = getCustomFableOption();
  if (y !== void 0 || isModelAvailableOnProvider(getLatestFamilyModel("fable").key))
    filterModelOptionsByAllowlist(payg3pOptions, y ?? generateModelSection("fable"));
  return payg3pOptions;
}
/**
 * 给任意模型 id 构造 /model 选项：有已知族时用族口号，若有更新版本提示 "Newer version available · select <族>"；未知族为 "Custom model (id)"。旧版名 getAgentModelOptions 不准确。
 */
//@ chunk-hwmsct5x.js:209773-210483 placement = getAgentModelOptions (0.574)
function buildModelOptionForId(e) {
  let n = getMarketingNameForModel(e);
  if (!n) return null;
  let r = getCanonicalName(e),
    s = null;
  if (r.includes("fable")) s = { alias: "Fable", aliasModel: getDefaultFableModel(), slogan: FABLE_SLOGAN };
  else if (r.includes("sonnet"))
    s = { alias: "Sonnet", aliasModel: getDefaultSonnetModel(), slogan: SONNET_SLOGAN };
  else if (r.includes("opus")) s = { alias: "Opus", aliasModel: getDefaultOpusModel(), slogan: OPUS_SLOGAN };
  else if (r.includes("haiku"))
    s = { alias: "Haiku", aliasModel: getDefaultHaikuModel(), slogan: HAIKU_SLOGAN };
  if (!s) return { value: e, label: n, description: `Custom model (${e})` };
  let h = getMarketingNameForModel(s.aliasModel),
    mapped = Object.values(No).map((S) => getCanonicalName(S.firstParty)),
    index = mapped.indexOf(r);
  if (
    h &&
    index !== -1 &&
    index < mapped.indexOf(getCanonicalName(s.aliasModel)) &&
    isModelAllowed(s.aliasModel)
  )
    return { value: e, label: n, description: `Newer version available \xB7 select ${s.alias} for ${h}` };
  return { value: e, label: n, description: `${s.slogan} (${e})` };
}
/**
 * 选项标签只是原始 id 时换成目录显示名，原标签放进描述。
 */
//@ chunk-hwmsct5x.js:210483-210616 placement
function relabelOptionFromCatalog(e) {
  if (!qto(e)) return e;
  let n = nameForUnnamedModelId(e.value);
  return n === void 0 ? e : { ...e, label: n, description: `${e.description} (${e.label})` };
}
/**
 * 去掉 disabled 行的模型选项。
 */
//@ chunk-hwmsct5x.js:210616-210674 placement
function getEnabledModelOptions(e = !1) {
  return buildModelPickerOptions(e).filter((n) => !n.disabled);
}
/**
 * 只在 claude-vscode 入口展示不可用模型行。
 */
//@ chunk-hwmsct5x.js:210674-210708 placement
var VSCODE_ENTRYPOINTS = new Set(["claude-vscode"]);
/**
 * VS Code 入口、第一方直连时返回被禁用的模型行（并记 model_unavailable_gate）。
 */
//@ chunk-hwmsct5x.js:210708-211169 placement
function getUnavailableModelRows(e) {
  if (!VSCODE_ENTRYPOINTS.has(env.CLAUDE_CODE_ENTRYPOINT ?? "")) return [];
  let n = count(e, (s) => s.disabled === !0),
    r = { total: e.length, disabled: n };
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
  return (logFeatureOk("model_unavailable_gate", r), e.filter((s) => s.disabled === !0));
}
/**
 * 对全部选项调用 getUnavailableModelRows。
 */
//@ chunk-hwmsct5x.js:211169-211202 placement
function getUnavailableModelOptions() {
  return getUnavailableModelRows(buildModelPickerOptions());
}
/**
 * 统计被丢弃的选项及原因（entitlement_denied/managed_denied/allowlist_filtered）。
 */
//@ chunk-hwmsct5x.js:211202-211344 placement
function recordDroppedModelOption(e, n, r) {
  if (e === null) return;
  (e.dropped++,
    e.dropReasons.add(
      isModelDenied(n, r)
        ? "entitlement_denied"
        : isModelDeniedSafe(n)
          ? "managed_denied"
          : "allowlist_filtered",
    ));
}
/**
 * deniedModels 判定，出错视为未拒绝。
 */
//@ chunk-hwmsct5x.js:211344-211393 placement
function isModelDeniedSafe(e) {
  try {
    return isModelDeniedByManagedSettings(e);
  } catch {
    return !1;
  }
}
/**
 * 生成模型选项并记 model_picker_options（总数、禁用、丢弃、重复、精选行）。
 */
//@ chunk-hwmsct5x.js:211393-211905 placement
function getModelOptionsWithTelemetry(e = !1, n) {
  let r = {
    dropped: 0,
    duplicates: 0,
    dropReasons: new Set(),
    disabledReasons: new Set(),
    curatedRows: 0,
    curatedReplaced: !1,
  };
  try {
    let s = buildModelPickerOptions(e, r);
    logFeatureOk("model_picker_options", {
      total: s.length,
      disabled: count(s, (h) => h.disabled === !0),
      dropped: r.dropped,
      duplicates: r.duplicates,
      curated_rows: r.curatedRows,
      curated_replaced: r.curatedReplaced,
    });
    for (let dropReason of r.dropReasons) logFeatureSad("model_picker_options", dropReason);
    for (let disabledReason of r.disabledReasons) logFeatureSad("model_picker_options", disabledReason);
    return s;
  } catch (error) {
    throw (logFeatureBad("model_picker_options", "build_failed"), error);
  }
}
/**
 * 去重模型选项；服务端目录里不可选的行标为禁用；组织默认行加注；model-error-overrides 命中的行禁用；禁用行排到最后。
 */
//@ chunk-hwmsct5x.js:211905-213303 placement
function buildModelPickerOptions(e = !1, n = null) {
  let r = new Set(),
    filtered = getModelOptions(e, n).filter((z) => {
      if (z.value === null) return !0;
      if (r.has(z.value)) {
        if (n !== null) n.duplicates++;
        return (
          logForDebugging(`model options: dropping duplicate row "${z.label}" (value ${z.value})`, {
            level: "warn",
          }),
          !1
        );
      }
      return (r.add(z.value), !0);
    }),
    h = isPublishedCatalogInUse() ? activeServedCatalog() : null,
    y =
      h === null
        ? []
        : buildCatalogRows({ catalog: h, provenance: "published" }).filter((z) => !z.selectable),
    w =
      y.length === 0
        ? filtered
        : filtered.map((z) => {
            if (z.value === null || z.disabled === !0) return z;
            let G = parseUserSpecifiedModel(z.value),
              q = findServedModel(G),
              J = uto(G),
              found = y.find((ne) => ne.row === q || ne.row === J || ne.key === normalizeModelId(G)),
              Q = found === void 0 ? null : buildCatalogModelOption(found);
            if (found === void 0 || Q === null) return z;
            return (
              n?.disabledReasons.add(isActiveCatalogModel(found.row) ? "not_offered" : "server_disabled"),
              { ...z, disabled: !0, description: Q.description }
            );
          }),
    { setting: setting, attribution: attribution } = resolveDefaultMainLoopModelSetting(),
    R = attribution === "org" ? setting : null,
    L = R ? getCanonicalName(R, { identity: !0 }) : null,
    O = R ? /\[1m\]$/i.test(R) : !1,
    M = L
      ? w.map((z) => {
          if (z.value === null || isModeDependentModelSetting(z.value)) return z;
          let G = parseUserSpecifiedModel(z.value);
          if (getCanonicalName(G, { identity: !0 }) !== L || /\[1m\]$/i.test(G) !== O) return z;
          return { ...z, description: `${z.description}${defaultModelAttributionSuffix("org")}` };
        })
      : w,
    mapped = markFableCreditRequired(M, n).map((z) => {
      if (z.disabled === !0) return z;
      try {
        let G = oc(
          getCanonicalName(z.value === null ? getDefaultMainLoopModel() : parseUserSpecifiedModel(z.value)),
        );
        if (G !== null) {
          if (n !== null) n.disabledReasons.add("error_override");
          return { ...z, disabled: !0, description: G };
        }
      } catch (error) {
        logForDebugging(`model-error-overrides picker hint failed: ${error}`, { level: "error" });
      }
      return z;
    }),
    filtered_2 = mapped.filter((z) => z.disabled === !0);
  if (filtered_2.length === 0) return mapped;
  return [...mapped.filter((z) => z.disabled !== !0), ...filtered_2];
}
/**
 * 有服务端模型目录时按目录行生成选项（第三方走 X_；第一方合并档位自定义行），否则 null。
 */
//@ chunk-hwmsct5x.js:213303-213848 placement
function getCatalogDrivenModelOptions(e, n) {
  let r = activeServedCatalog();
  if (r === null || isPublishedCatalogInUse()) return null;
  let s = buildCatalogRows({
      catalog: r,
      provenance: servedCatalogSource() === "published" ? "published" : "served",
    }),
    h = !Vte(),
    y = isPublishedCatalogActive();
  if (y && !usesFirstPartyModelIds()) return mergeCatalogOptions(s, e, n);
  let w = y && allowsCustomTierOptions(),
    S = [getDefaultOptionForUser(e)],
    E = [],
    R = (M) => {
      if (typeof M.value === "string" && Qt(M.value)) E.push(M);
      else S.push(M);
    },
    L = w ? getCustomTierOptions() : [],
    O = new Set();
  for (let M of s) {
    let found = L.find(([j]) => j === M.family);
    if (found !== void 0) {
      if (!O.has(found[0])) (O.add(found[0]), R(found[1]));
      continue;
    }
    let H = toCatalogOption(M, h, n);
    if (H === null) continue;
    if (w) R(H);
    else S.push(H);
  }
  for (let [M, P] of L) if (!O.has(M)) R(P);
  for (let M of E) filterModelOptionsByAllowlist(S, M);
  return S;
}
/**
 * ANTHROPIC_DEFAULT_{SONNET,OPUS,HAIKU,FABLE}_MODEL 对应的自定义选项。
 */
//@ chunk-hwmsct5x.js:213848-213970 placement = aliasMatchesParentTier (0.852)
function getCustomTierOptions() {
  return [
    ["sonnet", getCustomSonnetOption()],
    ["opus", getCustomOpusOption()],
    ["haiku", getCustomHaikuOption()],
    ["fable", getCustomFableOption()],
  ].flatMap(([e, n]) => (n === void 0 ? [] : [[e, n]]));
}
//@ chunk-hwmsct5x.js:213970-214250 placement
function toCatalogOption(e, n, r) {
  let s = buildCatalogModelOption(e);
  if (s === null) return null;
  let h = n ? applyUnavailability(s) : s;
  if (h === null) {
    if (r !== null) (r.dropped++, r.dropReasons.add("entitlement_denied"));
    return null;
  }
  if (h.disabled === !0 && r !== null)
    r.disabledReasons.add(
      s.disabled === !0 && isActiveCatalogModel(e.row) ? "not_offered" : "server_disabled",
    );
  return h;
}
/**
 * 用服务端目录过滤并补充内置模型选项：按模型字符串映射到目录行，可选行保留、隐藏行去掉、不可用行显示为禁用并附通知，再追加目录中其他非弃用模型。
 */
//@ chunk-hwmsct5x.js:214250-215482 placement
function mergeCatalogOptions(entries, baseContext, stats) {
  let modelStrings = getModelStrings(),
    keyById = new Map();
  for (let M of Object.keys(modelStrings)) {
    let P = normalizeModelId(Lt(String(modelStrings[M])));
    if (isModelAvailableOnProvider(M) && !keyById.has(P)) keyById.set(P, M);
  }
  let customTierFamilies = new Set(getCustomTierOptions().map(([M]) => M)),
    resolveKey = (M) => {
      let P = Lt(M);
      if (!I_(P)) return keyById.get(normalizeModelId(P));
      if (customTierFamilies.has(P)) return "pinned";
      return keyById.get(normalizeModelId(Lt(String(parseUserSpecifiedModel(P)))));
    },
    defaultKeys = new Set();
  for (let M of [getDefaultOpusModel(), getDefaultSonnetModel(), getDefaultHaikuModel()]) {
    let P = keyById.get(normalizeModelId(Lt(String(M))));
    if (P !== void 0) defaultKeys.add(P);
  }
  let selectableKeys = new Set(),
    inactiveRows = new Map(),
    hiddenKeys = new Set();
  for (let M of entries) {
    let P = Yte(M.row.id);
    if (P === void 0) continue;
    if (Cxt(M.row)) {
      hiddenKeys.add(P);
      continue;
    }
    if (M.selectable) selectableKeys.add(P);
    else if (!isActiveCatalogModel(M.row) && M.row.section !== "deprecated" && !inactiveRows.has(P))
      inactiveRows.set(P, M.row);
  }
  let options = [];
  for (let M of getModelOptionsBase(baseContext)) {
    if (M.value === null) {
      options.push(M);
      continue;
    }
    let P = resolveKey(M.value);
    if (P === "pinned") {
      options.push(M);
      continue;
    }
    if (P === void 0) continue;
    if (selectableKeys.has(P)) {
      options.push(M);
      continue;
    }
    if (hiddenKeys.has(P)) continue;
    let inactiveRow = inactiveRows.get(P);
    if (inactiveRow === void 0 && defaultKeys.has(P)) {
      options.push(M);
      continue;
    }
    if (inactiveRow === void 0 || Lt(M.value) !== M.value) continue;
    if (
      (options.push({
        ...M,
        disabled: !0,
        description:
          markdownSafeText(inactiveRow.selection_notice?.text ?? inactiveRow.notice?.text ?? "") ||
          "Not available",
      }),
      stats !== null)
    )
      stats.disabledReasons.add("server_disabled");
  }
  for (let M of entries) {
    if (
      M.row.section === "deprecated" ||
      Cxt(M.row) ||
      Yte(M.row.id) !== void 0 ||
      (M.family !== void 0 && customTierFamilies.has(M.family))
    )
      continue;
    let P = toCatalogOption(M, !0, stats);
    if (P !== null) options.push(P);
  }
  return options;
}
//@ chunk-hwmsct5x.js:215482-215689 placement
function applyUnavailability(e) {
  if (e.disabled === !0 || e.value === null) return e;
  let n = getModelUnavailabilityReason(e.value);
  if (n === null) return e;
  switch (n.reason) {
    case "disabled":
      return { ...e, disabled: !0, description: n.description };
    case "absent":
      return null;
  }
}
/**
 * 把目录行转为 /model 选项：标签取名称/营销名（保密模型遮盖代号）；不可选时显示为禁用并带通知或最低版本说明；可选时值优先用别名族。
 */
//@ chunk-hwmsct5x.js:215689-216239 placement
function buildCatalogModelOption(entry) {
  let { row: row } = entry,
    isConfidential = row.confidential === !0,
    label =
      sanitizeTitle(row.name ?? "") ||
      getMarketingNameForModel(row.id) ||
      sanitizeTitle(isConfidential ? maskModelCodename(Lt(row.id)) : row.id) ||
      "Unknown model",
    description = tl(markdownSafeText(row.description ?? ""), row);
  if (!entry.selectable) {
    if (Cxt(row)) return null;
    let notice;
    if (!isActiveCatalogModel(row))
      notice = markdownSafeText(row.selection_notice?.text ?? row.notice?.text ?? "");
    else if (!Rxt(row)) notice = getUnsupportedModelMessage(row);
    else return null;
    return {
      value: row.id,
      label: label,
      description: (notice === "" ? description : tl(notice, row)) || "Not available",
      disabled: !0,
    };
  }
  let providerModelId = resolveProviderModelId(row) ?? row.id,
    aliasFamily = entry.aliasFamily ?? (entry.family === "fable" ? "fable" : void 0);
  return {
    value:
      (aliasFamily !== void 0 && isExcludedModel(entry, aliasFamily) ? aliasFamily : void 0) ??
      providerModelId,
    label: label,
    description: description || tl(getFamilySlogan(entry.family), row),
  };
}
//@ chunk-hwmsct5x.js:216239-216265 placement
function tl(e, n) {
  return e;
}
//@ chunk-hwmsct5x.js:216265-216375 placement = isExcludedModel (0.817)
function isExcludedModel(e, n) {
  let r = parseUserSpecifiedModel(n);
  if (usesFirstPartyModelIds()) return normalizeModelId(r) === e.key;
  return n === "haiku" && normalizeModelId(getCanonicalName(r, { identity: !0 })) === e.key;
}
/**
 * 族口号（Opus：Best for everyday, complex tasks 等）。
 */
//@ chunk-hwmsct5x.js:216375-216506 layout = aliasMatchesParentTier (0.852)
function getFamilySlogan(e) {
  switch (e) {
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
/**
 * /model 选项总装：服务端目录或内置列表 → ANTHROPIC_CUSTOM_MODEL_OPTION → 网关发现模型 → 附加模型选项 → Fable 行 → availableModels 里的显式模型 → 服务端目录补行 → 白名单过滤 → 确保当前设置的模型（含 opusplan/opus/opus[1m]/自定义）在列表里。
 */
//@ chunk-hwmsct5x.js:216506-219700 fingerprint = getModelOptions (0.541)
function getModelOptions(e, n) {
  let r = getCatalogDrivenModelOptions(e, n),
    s = r ?? getModelOptionsBase(e),
    h = r !== null && isPublishedCatalogActive(),
    ANTHROPIC_CUSTOM_MODEL_OPTION = env.ANTHROPIC_CUSTOM_MODEL_OPTION,
    w = ANTHROPIC_CUSTOM_MODEL_OPTION ? s.findIndex((G) => G.value === ANTHROPIC_CUSTOM_MODEL_OPTION) : -1,
    S = w !== -1 && h && s[w]?.disabled === !0 && !isFirstPartyApiBackend();
  if (ANTHROPIC_CUSTOM_MODEL_OPTION && (w === -1 || S)) {
    let G = {
      value: ANTHROPIC_CUSTOM_MODEL_OPTION,
      label:
        env.ANTHROPIC_CUSTOM_MODEL_OPTION_NAME ??
        nameForUnnamedModelId(ANTHROPIC_CUSTOM_MODEL_OPTION) ??
        ANTHROPIC_CUSTOM_MODEL_OPTION,
      description:
        env.ANTHROPIC_CUSTOM_MODEL_OPTION_DESCRIPTION ?? `Custom model (${ANTHROPIC_CUSTOM_MODEL_OPTION})`,
      sessionTail: !0,
    };
    if (S) s[w] = G;
    else s.push(G);
  }
  let E = r === null || h ? getGatewayModelOptions() : [];
  for (let G of E) {
    let options = relabelOptionFromCatalog(G),
      index = s.findIndex((Z) => optionsMatch(Z, options));
    if (index === -1) filterModelOptionsByAllowlist(s, options);
    else if (h && s[index]?.disabled === !0 && options.disabled !== !0) s[index] = options;
  }
  let R = getAPIProvider();
  if (r === null && (R === "firstParty" || R === "gateway")) {
    let G = R === "gateway" || isFirstPartyAnthropicBaseUrl();
    for (let q of getAdditionalModelOptionsCache()) {
      let J = appendFableCreditSuffix(q);
      if (J.disabled && !G) continue;
      if (!s.some((Z) => optionsMatch(Z, J))) {
        if (J.disabled === !0 && n !== null) n.disabledReasons.add("server_disabled");
        filterModelOptionsByAllowlist(s, J);
      }
    }
  }
  let L = isPublishedCatalogInUse() ? activeServedCatalog() : null;
  if (
    r === null &&
    R === "firstParty" &&
    (isFableAvailable() ||
      (L !== null &&
        withCatalogSuppressed(isFableAvailable) &&
        getModelUnavailabilityReason("fable")?.reason === "disabled")) &&
    !s.some((G) => typeof G.value === "string" && Qt(G.value))
  )
    filterModelOptionsByAllowlist(s, getFableOption(getDefaultFableModel(), e));
  let { availableModels: availableModels } = getSettings_DEPRECATED() ?? {};
  if (availableModels)
    for (let G of availableModels) {
      let trimmed = G.trim();
      if (s.some((Q) => Q.value === trimmed)) continue;
      if (trimmed.startsWith("anthropic.")) {
        let Q = nameForUnnamedModelId(trimmed);
        s.push({
          value: trimmed,
          label: Q ?? trimmed,
          description: Q === void 0 ? "Custom model" : `Custom model (${trimmed})`,
          sessionTail: !0,
        });
        continue;
      }
      let lower = Lt(trimmed).toLowerCase();
      if (!usesFirstPartyModelIds() || !/^claude-[a-z0-9-]+$/.test(lower)) continue;
      if (
        !["opus", "sonnet", "haiku"].some((Q) => lower.includes(Q)) &&
        !(R === "gateway" && isFableModelValue(lower))
      )
        continue;
      if (isModelRemappedOrRetired(trimmed)) continue;
      if (Lt(trimmed) !== trimmed) {
        if (
          !(lower.includes("opus")
            ? shouldProbeThirdPartyDefaults()
            : lower.includes("sonnet")
              ? shouldProbeThirdPartyDefaultsAlt()
              : !0) ||
          isLegacyNo1mModel(getCanonicalName(lower))
        )
          continue;
      }
      let Z = buildModelOptionForId(trimmed);
      if (Z !== null && !s.some((Q) => optionsMatch(Q, Z)))
        filterModelOptionsByAllowlist(s, { ...Z, sessionTail: !0 });
    }
  if (L !== null) {
    let G = new Set(
      s.map((q) => (q.value === null ? void 0 : findServedModel(parseUserSpecifiedModel(q.value)))),
    );
    for (let q of buildCatalogRows({ catalog: L, provenance: "published" })) {
      if (q.row.section === "deprecated" || Yte(q.row.id) !== void 0) continue;
      if (
        (q.family === "fable" && !isFableAvailable()) ||
        s.some(
          (existing) =>
            existing.disabled === !0 && existing.value !== null && Lt(existing.value) === q.family,
        )
      )
        continue;
      let Z = toCatalogOption(q, !0, n);
      if (Z === null) continue;
      if (!G.has(q.row)) {
        s.push(Z);
        continue;
      }
      let Q = Z.value;
      if (Q === null || !I_(Q)) continue;
      let index = s.findIndex((existing) => existing.value !== null && Lt(existing.value) === Q);
      if (index !== -1)
        s[index] = {
          value: Q,
          label: capitalize(Q),
          description: `${Z.label} \xB7 ${getFamilySlogan(q.family)}`,
        };
    }
  }
  s = applyCuratedPicker(s, n);
  let customModel = null,
    currentMainLoopModel = getUserSpecifiedModelSetting(),
    initialMainLoopModel = getInitialMainLoopModel();
  if (currentMainLoopModel !== void 0 && currentMainLoopModel !== null) customModel = currentMainLoopModel;
  else if (initialMainLoopModel !== void 0 && initialMainLoopModel !== null)
    customModel = initialMainLoopModel;
  let j = customModel === null ? -1 : s.findIndex((opt) => opt.value === customModel),
    z = s[j];
  if (customModel !== null && z !== void 0 && Rc(z) && getModelUnavailabilityReason(customModel) === null)
    s[j] = { value: customModel, label: z.label, description: "Custom model", sessionTail: !0 };
  if (customModel === null || j !== -1) return expandGatewayAliasOptions(s, n);
  else if (customModel === "opusplan") return expandGatewayAliasOptions([...s, getOpusPlanOption()], n);
  else if (Qt(customModel)) {
    let G = { value: customModel, label: "", description: "" },
      index = s.findIndex((J) => optionsMatch(J, G));
    if (index !== -1) s[index] = { ...s[index], value: customModel };
    else filterModelOptionsByAllowlist(s, { ...getHaiku35Option(customModel), sessionTail: !0 });
    return expandGatewayAliasOptions(s, n);
  } else if (customModel === "opus") {
    if (!usesFirstPartyModelIds()) {
      let q = getDefaultOpusModel();
      return expandGatewayAliasOptions(
        s.map((J) => (J.value === q ? { ...J, value: "opus" } : J)),
        n,
      );
    }
    let knownOption = getMaxOpusOption(!1);
    return expandGatewayAliasOptions(
      s.some((q) => typeof q.value === "string" && Lt(q.value) === q.value && optionsMatch(q, knownOption))
        ? s
        : [...s, { ...knownOption, sessionTail: !0 }],
      n,
    );
  } else if (customModel === "opus[1m]" && usesFirstPartyModelIds()) {
    let G = getOpus1mDefaultOption(!1);
    return expandGatewayAliasOptions(
      s.some((q) => optionsMatch(q, G)) ? s : [...s, { ...G, sessionTail: !0 }],
      n,
    );
  } else {
    let G = { value: customModel, label: "", description: "" };
    if (s.some((q) => optionsMatch(q, G))) return expandGatewayAliasOptions(s, n);
    return (
      s.push({
        ...(buildModelOptionForId(customModel) ?? {
          value: customModel,
          label: customModel,
          description: "Custom model",
        }),
        sessionTail: !0,
      }),
      expandGatewayAliasOptions(s, n)
    );
  }
}
/**
 * 未弃用、被允许、未缺席，别名形式需 1M 可用且不是旧模型。
 */
//@ chunk-hwmsct5x.js:219700-219894 placement = aliasMatchesParentTier (0.792)
function isOfferableModel(e) {
  if (
    isModelRemappedOrRetired(e) ||
    !isModelAllowed(e) ||
    getModelUnavailabilityReason(e)?.reason === "absent"
  )
    return !1;
  let canonical = Lt(e);
  if (canonical === e) return !0;
  let r = getCanonicalName(canonical.toLowerCase());
  return (
    (r.includes("opus")
      ? shouldProbeThirdPartyDefaults()
      : r.includes("sonnet")
        ? shouldProbeThirdPartyDefaultsAlt()
        : !0) && !isLegacyNo1mModel(r)
  );
}
/**
 * 应用精选模型选择器：去重、过滤不可提供的模型，构建选项（不可用时禁用）；replaceBuiltInOptions 时替换内置选项，否则合并（同模型的可用项替换原项）。
 */
//@ chunk-hwmsct5x.js:219894-220643 placement
function applyCuratedPicker(options, stats) {
  let curated = getCuratedModelPicker();
  if (!curated) return options;
  let { picker: picker } = curated,
    isManaged = curated.source === "policySettings",
    seen = new Set(),
    curatedOptions = [];
  for (let option of picker.options) {
    let trimmed = option.model.trim();
    if (trimmed === "" || seen.has(trimmed) || !isOfferableModel(trimmed)) continue;
    seen.add(trimmed);
    let L = buildCuratedOption(
        trimmed,
        option.label?.trim() || void 0,
        option.description?.trim() || void 0,
        isManaged,
      ),
      O = getModelUnavailabilityReason(trimmed);
    if (O?.reason === "disabled") {
      if (stats !== null) stats.disabledReasons.add("server_disabled");
      curatedOptions.push({ ...L, disabled: !0, description: O.description });
      continue;
    }
    curatedOptions.push(L);
  }
  if (curatedOptions.length === 0) return options;
  if (stats !== null)
    ((stats.curatedRows = curatedOptions.length),
      (stats.curatedReplaced = picker.replaceBuiltInOptions === !0));
  if (picker.replaceBuiltInOptions === !0)
    return [...options.filter((E) => E.value === null), ...curatedOptions];
  let merged = [...options];
  for (let E of curatedOptions) {
    let index = merged.findIndex((O) => optionsMatch(O, E)),
      L = merged[index];
    if (L === void 0) merged.push(E);
    else if (E.disabled !== !0 && Rc(L)) merged[index] = E;
  }
  return merged;
}
//@ chunk-hwmsct5x.js:220643-220695 placement
function Rc(e) {
  return e.disabled === !0 && isPublishedCatalogActive() && !isFirstPartyApiBackend();
}
//@ chunk-hwmsct5x.js:220695-220890 placement
function buildCuratedOption(e, n, r, s) {
  let h = buildModelOptionForId(e),
    y = n ?? h?.label ?? e,
    w = r ?? (s ? `Managed by your organization (${e})` : `Custom model (${e})`);
  return { value: e, label: y, description: w, descriptionForModel: r ? `${r} (${e})` : w };
}
/**
 * 在选项中找到与给定模型值相同或等价的选项值。
 */
//@ chunk-hwmsct5x.js:220890-221057 placement
function findMatchingOptionValue(e, n) {
  if (e.some((h) => h.value === n)) return n;
  let r = { value: n, label: "", description: "" },
    found = e.find((h) => optionsMatch(h, r));
  return typeof found?.value === "string" ? found.value : void 0;
}
/**
 * 判断两个模型选项是否指向同一模型：值相同、Fable 族键相同，或解析后的模型（含规范名回退）相同且 1M 后缀一致。
 */
//@ chunk-hwmsct5x.js:222714-223062 placement
function optionsMatch(e, n) {
  if (e.value === n.value) return !0;
  if (typeof e.value !== "string" || typeof n.value !== "string") return !1;
  let r = getFableFamilyKey(e.value),
    s = getFableFamilyKey(n.value);
  if (r !== void 0 && s !== void 0 && (r === s || r === al || s === al)) return !0;
  let h = parseUserSpecifiedModel(e.value),
    y = parseUserSpecifiedModel(n.value);
  if (Bn(h) !== Bn(y)) {
    let w = usesFirstPartyModelIds() ? void 0 : strippedCanonicalName(y);
    if (!anyModelDescribed(w) || strippedCanonicalName(h) !== w) return !1;
  }
  return has1mSuffix(e.value) === has1mSuffix(n.value) || modelHasNative1MContext(h);
}
//@ chunk-hwmsct5x.js:223062-223121 placement
function Qt(e) {
  return e === "fable" || e === "fable[1m]" || isFableModelValue(e);
}
//@ chunk-hwmsct5x.js:223121-223138 placement
var al = "fable:*";
/**
 * 取模型值对应的 Fable 族键：fable 别名解析默认 Fable 模型，其他值用目录中 Fable 模型 id 正则匹配。
 */
//@ chunk-hwmsct5x.js:223138-223531 placement
function getFableFamilyKey(e) {
  if (e === "fable" || e === "fable[1m]") {
    let s = Lt(getCanonicalName(getDefaultFableModel(), { identity: !0 }));
    return getCatalogEntry(s)?.family === "fable" ||
      anyModelDescribed(s) ||
      (isPublishedCatalogInUse() && getCatalogEntry(s) === void 0 && findServedModel(s) !== void 0)
      ? s
      : al;
  }
  let sorted = WK()
    .models.filter((model) => model.family === "fable")
    .map((s) => s.id)
    .sort((s, h) => h.length - s.length);
  return new RegExp(
    `(?:^|[./])(${sorted.join("|")})(?:[-@]\\d{8})?(?:-v\\d+(?::\\d+)?)?(?:\\[[12]m\\])?$`,
    "i",
  )
    .exec(e)?.[1]
    ?.toLowerCase();
}
/**
 * 对需要额外用量额度的 Fable 选项标记为禁用并加"requires usage credits"说明（按计费模式判断），记录禁用原因。
 */
//@ chunk-hwmsct5x.js:223531-223942 placement
function markFableCreditRequired(e, n) {
  if (!Cd() || isConsumerPlan() || !isExtraUsageOrgDisabled()) return e;
  return e.map((r) => {
    if (r.disabled === !0 || typeof r.value !== "string" || !Qt(r.value)) return r;
    let s = parseUserSpecifiedModel(r.value),
      h = usageCreditsBillingState(s);
    if (h === "pay_per_request" || h === "included_in_plan") return r;
    let y = isUsageCreditsModelBilled(s) ? "" : " \u2014 requires usage credits";
    if (n !== null) n.disabledReasons.add("credits_required");
    return { ...r, disabled: !0, label: "Fable (disabled)", description: `${r.description}${y}` };
  });
}
/**
 * 插入 Fable 等“置顶族”行：放在 Default 之后、与默认模型同族的行后面。
 */
//@ chunk-hwmsct5x.js:223942-224874 callgraph-witnessed = filterModelOptionsByAllowlist (0.39)
function filterModelOptionsByAllowlist(e, n) {
  if (!(typeof n.value === "string" && Qt(n.value))) {
    e.push(n);
    return;
  }
  let index = e.findIndex((H) => H.value === null);
  if (index === -1) {
    e.splice(0, 0, n);
    return;
  }
  let s = getModelFamilyFromString(getDefaultMainLoopModel()),
    h = e[index + 1]?.value,
    y = e[index + 1],
    w = typeof h === "string" && y !== void 0 ? resolveGatewayAliasOptionModel(e, y) : null,
    S = (H) =>
      w !== null &&
      getCanonicalName(Lt(H), { identity: !0 }) === getCanonicalName(Lt(w), { identity: !0 }) &&
      (Lt(H) !== H) === (Lt(w) !== w) &&
      isModelAllowed(H),
    E = getUserSpecifiedModelSetting() ?? getInitialMainLoopModel() ?? null,
    R =
      (typeof E === "string" && S(E)) ||
      (getSettings_DEPRECATED()?.availableModels ?? []).some((opt) => S(opt.trim())) ||
      getGatewayModelOptions().some((H) => typeof H.value === "string" && S(H.value)) ||
      getAdditionalModelOptionsCache().some((H) => typeof H.value === "string" && S(H.value)) ||
      (getCuratedModelPicker()?.picker.options ?? []).some((H) => S(H.model.trim())),
    L = typeof h === "string" && (isModelAllowlistInactive() || isModelAllowed(h) || (w !== null && !R)),
    O = typeof h === "string" && I_(Lt(h)) ? getModelFamilyFromString(h) : null,
    M = new Set();
  if (O !== null) {
    if ((M.add(O), !L && s !== null)) M.add(s);
  } else if (s !== null) M.add(s);
  let P = index + 1;
  while (P < e.length) {
    let H = e[P]?.value;
    if (typeof H !== "string") break;
    let j = getModelFamilyFromString(H);
    if ((j !== null && M.has(j)) || Qt(H)) P++;
    else break;
  }
  e.splice(P, 0, n);
}
/**
 * 字符串里的族名（fable/opus/sonnet/haiku），没有为 null。
 */
//@ chunk-hwmsct5x.js:224874-225071 affinity = aliasMatchesParentTier (0.852)
function getModelFamilyFromString(e) {
  let lower = e.toLowerCase();
  if (lower.includes("fable")) return "fable";
  if (lower.includes("opus")) return "opus";
  if (lower.includes("sonnet")) return "sonnet";
  if (lower.includes("haiku")) return "haiku";
  return null;
}
/**
 * 当前提供商 catalog sonnet 档的模型字符串，缺失时 sonnet46。旧版名 getSonnet46Option 为错配（不是选项）。
 */
//@ chunk-aepeg2w5.js:438212-438266 fingerprint = getSonnet46Option (0.561)
function getDefaultSonnetBuiltin(e = getModelStrings()) {
  return ju("sonnet", e) ?? e.sonnet46;
}
/**
 * sonnet-4-5、sonnet-4-0、3-7、3-5 的规范名集合。旧版名 getModelFamilyInfo 为错配。
 */
//@ chunk-d1cgs5na.js:12554-12651 fingerprint = getModelFamilyInfo (0.437)
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
  buildModelOptionForId,
  recordDroppedModelOption,
  Qt,
};
