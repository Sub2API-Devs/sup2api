/**
 * utils/model/modelDisplay.ts
 *
 * 2.1.316 新增：模型显示名与模型选择器条目（订阅类型、Fable、[1m]）。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-exfmq47h.js (29)
 * attribution: placement 29
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import {
  normalizeModelSpelling,
  isKnownCustomModel,
  LEGACY_SUBAGENT_MODEL_IDS,
  getMarketingNameForModel,
  getDefaultOpusModel,
  getDefaultSonnetModel,
  tierOverrideModel,
  getDefaultOpusBuiltin,
  strip1mTagWhereBuiltIn,
  isModelOverrideTarget,
  nameForUnnamedModelId,
  isFableFamilyOrPinnedModel,
  resolveModelAliasSetting,
} from "./model.js";
import { isModelKeyAlias, strip1mSuffix, stripAnyVersatileSuffix } from "./modelIds.js";
import {
  isModeDependentModelSetting,
  isOpusFableAdvisorSetting,
  resolveDefaultMainLoopModelSetting,
  defaultModelAttributionSuffix,
  append1mSuffixIfMissing,
} from "./planModeModel.js";
import {
  getCanonicalName,
  isRecognizedCanonical,
  getSettingsModelOverrides,
  strippedCanonicalName,
} from "./canonicalModelName.js";
import {
  servedRowFamily,
  isPublishedCatalogInUse,
  matchesCatalogList,
  servedRuntime,
  findEffectiveServedEntry,
  isServedCatalogActive,
} from "./modelCatalog/servedCatalog.js";
import { modelFamilyOf, usesFirstPartyPricing, getAPIProvider } from "./providers.js";
import { isFastModeOnForModel, supportsFastMode } from "../fastMode.js";
import { firstPartyNameToCanonical } from "./modelFallback.js";
import { formatModelPricing, getFastModeCosts, getModelPricingDisplay } from "../modelCost.js";
import { LIGHTNING } from "../../constants/figures.js";
import {
  getSubscriptionType,
  isTeamPremiumSubscriber,
  isEnterprisePAYGSubscriber,
  isProSubscriber,
  isClaudeAISubscriber,
  getAdditionalModelOptionsCache,
} from "../auth.js";
import { isSonnetOnlySteering } from "./smallFastModel.js";
import { is1mContextDisabled, get1mContextSupport } from "./contextWindow1m.js";
import { env } from "../env.js";
import { getMainLoopModelOverride } from "../../bootstrap/state.js";
import {
  getEffectiveSettingSource,
  getRelativeSettingsFilePathForSource,
  getSecuritySensitiveSettingWithSources,
} from "../settings/settings.js";
import { getCatalogEntry, catalogIdForProviderModelId, setServedCapabilityLookup } from "./modelCatalog.js";
import { getEnabledSettingSources } from "../settings/constants.js";
import { normalizeModelId } from "./modelCatalog/catalogEntries.js";
import { MAX_LOOKUP_BUCKETS, anyModelDescribed } from "./modelCatalog/catalogCapabilities.js";
import { getProviderState, findModelConfigById } from "./providerCaches.js";
import {
  gatewayCatalogRowId,
  hasProviderModelId,
  gatewayGeneration,
} from "../../services/gateway/hostCheck.js";
import { commandSyncNameState } from "../settings/commandSyncNames.js";
import { sanitizeTitle } from "../resultError.js";
import { getGatewayModelOptions, isSanitizedModelOption } from "../../services/gateway/gatewayDiscovery.js";
import { DEFAULT_MODEL_FAMILY_NAMES, isProbeWrittenValue, firstWord } from "./thirdPartyModelDefaults.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../../services/analytics/growthbook.js";
import { identityModelId } from "./bedrock.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-exfmq47h.js:440808-440919 placement (2.1.88 match: resolveAgentModelDisplay, 1)
/**
 * 判断字符串是否为客户端可用的模型写法（别名、模型 ID、default、inherit 等）；供 utils/model 的 isClientSpelling 使用（共享指纹误归 agentDisplay）。
 */
function isClientModelSpelling(agent) {
  let normalized = normalizeModelSpelling(agent);
  if (normalized === "") return false;
  return (
    isModelKeyAlias(normalized) ||
    isModeDependentModelSetting(normalized) ||
    isOpusFableAdvisorSetting(normalized) ||
    normalized === "default" ||
    normalized === "inherit" ||
    isKnownCustomModel(normalized)
  );
}
//@ chunk-exfmq47h.js:471092-471188 placement
function bytesPerTokenForModel(model) {
  if (!model) return 4;
  let userSpecifiedModel = parseUserSpecifiedModel(model);
  let replaced = strip1mSuffix(getCanonicalName(userSpecifiedModel)).replace(/[._]/g, "-");
  return LEGACY_SUBAGENT_MODEL_IDS.has(replaced) ? 4 : 3;
}
//@ chunk-exfmq47h.js:471188-471808 placement
function getClaudeAiUserDefaultModelDescription(fastMode = false) {
  let { setting, attribution } = resolveDefaultMainLoopModelSetting();
  if (attribution === "served") {
    let name = getMarketingNameForModel(stripAnyVersatileSuffix(setting)) ?? renderModelName(setting);
    let family =
      servedRowFamily(setting) ?? modelFamilyOf(setting, getCanonicalName(parseUserSpecifiedModel(setting)));
    let blurb =
      family === "opus"
        ? " \xB7 Best for everyday, complex tasks"
        : family === "sonnet"
          ? " \xB7 Efficient for routine tasks"
          : "";
    let pricing =
      isFastModeOnForModel(fastMode, setting) && supportsFastMode(setting)
        ? getModelPricingSuffix(true, setting)
        : "";
    return `${name}${blurb}${pricing}`;
  }
  if (attribution !== "tier")
    return `${getMarketingNameForModel(stripAnyVersatileSuffix(parseUserSpecifiedModel(setting))) ?? renderModelName(setting)}${defaultModelAttributionSuffix(attribution)}`;
  if (isOpusDefaultSubscriber()) {
    let defaultOpusModel = getDefaultOpusModel();
    let opusName = getMarketingNameForModel(stripAnyVersatileSuffix(defaultOpusModel)) ?? "Opus";
    let showFastPrice =
      isFastModeOnForModel(fastMode, defaultOpusModel) && supportsFastMode(defaultOpusModel);
    if (opus1mMergeAddsTagTo(defaultOpusModel))
      return `${opusName} with 1M context \xB7 Best for everyday, complex tasks${showFastPrice ? getModelPricingSuffix(true, defaultOpusModel) : ""}`;
    return `${opusName} \xB7 Best for everyday, complex tasks${showFastPrice ? getModelPricingSuffix(true, defaultOpusModel) : ""}`;
  }
  return `${getMarketingNameForModel(stripAnyVersatileSuffix(getDefaultSonnetModel())) ?? "Sonnet"} \xB7 Efficient for routine tasks`;
}
//@ chunk-exfmq47h.js:471808-471898 placement
function renderDefaultModelSetting(setting) {
  if (setting === "opusplan") return "Opus in plan mode, else Sonnet";
  return renderModelName(parseUserSpecifiedModel(setting));
}
//@ chunk-exfmq47h.js:471898-472030 placement
function getModelPricingSuffix(fastMode, model) {
  if (!usesFirstPartyPricing()) return "";
  let canonical = firstPartyNameToCanonical(model);
  let price = fastMode ? formatModelPricing(getFastModeCosts(canonical)) : getModelPricingDisplay(canonical);
  if (price === undefined) return "";
  return ` \xB7${fastMode ? ` (${LIGHTNING})` : ""} ${price}`;
}
//@ chunk-exfmq47h.js:472030-472185 placement (2.1.88 match: hasOpusAccess, 1)
/**
 * 是否可用 Opus：max 恒可；team 需 premium 或特性未限制；enterprise 需按量计费或未限制；pro 视特性。
 */
function isOpusDefaultSubscriber() {
  switch (getSubscriptionType()) {
    case "max":
      return true;
    case "team":
      return isTeamPremiumSubscriber() || !isSonnetOnlySteering();
    case "enterprise":
      return isEnterprisePAYGSubscriber() || !isSonnetOnlySteering();
    case "pro":
      return !isSonnetOnlySteering();
    default:
      return false;
  }
}
//@ chunk-exfmq47h.js:472185-472405 placement (2.1.88 match: isOpus1mMergeEnabled, 0.407)
/**
 * Opus 1M 合并是否启用：未禁 1M、非 Pro、第一方；订阅用户需有订阅类型；默认 Opus 不能是 never 支持 1M 的模型。
 */
function isOpus1mMergeEnabled() {
  if (is1mContextDisabled() || isProSubscriber() || getAPIProvider() !== "firstParty") return false;
  if (isClaudeAISubscriber() && getSubscriptionType() === null) return false;
  if (env.ANTHROPIC_DEFAULT_OPUS_MODEL === undefined) {
    let opusOverride = tierOverrideModel("opus");
    if (
      opusOverride !== undefined &&
      get1mContextSupport(opusOverride) === "never" &&
      !(isPublishedCatalogInUse() && opusOverride === getDefaultOpusBuiltin())
    )
      return false;
  }
  return true;
}
//@ chunk-exfmq47h.js:472405-472451 placement
/**
 * 合并启用且该模型 1M 模式为 optIn。
 */
function opus1mMergeAddsTagTo(model) {
  return isOpus1mMergeEnabled() && get1mContextSupport(model) === "optIn";
}
//@ chunk-exfmq47h.js:472451-472499 placement
/**
 * 默认 Opus 的 1M 模式为 optIn（此时 opus 默认带 [1m]）。
 */
function opus1mMergeTagsDefaultOpus() {
  return isOpus1mMergeEnabled() && get1mContextSupport(getDefaultOpusModel()) === "optIn";
}
//@ chunk-exfmq47h.js:472499-472536 placement
/**
 * optIn 时给模型加 [1m]。
 */
function applyOpus1mOptIn(defaultOpusModel) {
  return opus1mMergeAddsTagTo(defaultOpusModel)
    ? append1mSuffixIfMissing(defaultOpusModel)
    : defaultOpusModel;
}
//@ chunk-exfmq47h.js:472536-472626 placement (2.1.88 match: renderModelSetting, 1)
/**
 * 设置值的显示：opusplan 显示 "Opus Plan"，别名显示解析后模型名，否则直接显示名。
 */
function renderModelSetting(setting) {
  if (setting === "opusplan") return "Opus Plan";
  if (isModelKeyAlias(setting)) return renderModelName(parseUserSpecifiedModel(setting));
  return renderModelName(setting);
}
//@ chunk-exfmq47h.js:472626-472852 placement
/**
 * 模型来自项目设置或托管设置时返回 " (from …)"；有会话覆盖或 ANTHROPIC_MODEL 时为空。
 */
function getModelSourceAnnotation() {
  if (getMainLoopModelOverride() !== undefined) return "";
  if (env.ANTHROPIC_MODEL) return "";
  switch (getEffectiveSettingSource("model")) {
    case "projectSettings":
      return ` (from ${getRelativeSettingsFilePathForSource("projectSettings")})`;
    case "policySettings":
      return " (from managed settings)";
    default:
      return "";
  }
}
//@ chunk-exfmq47h.js:472852-472921 placement (2.1.88 match: resolveSkillModelOverride, 0.834)
/**
 * 规范名在 catalog 的 display_name（[1m] 且支持时加 " (1M context)"）。旧版名 resolveSkillModelOverride_5 为错配。
 */
function getPublicModelDisplayName(model) {
  return getCatalogDisplayName(
    getCanonicalName(model, {
      identity: true,
    }),
    strip1mTagWhereBuiltIn(model).endsWith("[1m]"),
  );
}
//@ chunk-exfmq47h.js:472921-473050 placement
/**
 * catalog display_name，带 [1m] 且 supports_1m_suffix 时加 " (1M context)"。
 */
function getCatalogDisplayName(canonical, withSuffix) {
  let catalogEntry = getCatalogEntry(canonical);
  if (!catalogEntry) return null;
  let suffix = withSuffix && catalogEntry.context?.supports_1m_suffix ? " (1M context)" : "";
  return catalogEntry.display_name + suffix;
}
//@ chunk-exfmq47h.js:473050-473165 placement
/**
 * 机密模型代号只露前三个字母，其余换成星号。
 */
function maskModelCodename(baseName) {
  let [codename = "", ...rest] = baseName.split("-");
  return [codename.slice(0, 3) + "*".repeat(Math.max(0, codename.length - 3)), ...rest].join("-");
}
//@ chunk-exfmq47h.js:473165-473293 placement
/**
 * 已启用设置源里第一个 modelPicker 配置及其来源。
 */
function getCuratedModelPicker() {
  let enabledSettingSources = getEnabledSettingSources();
  let found = getSecuritySensitiveSettingWithSources("modelPicker").find((entry) =>
    enabledSettingSources.includes(entry.source),
  );
  return found
    ? {
        picker: found.value,
        source: found.source,
      }
    : undefined;
}
//@ chunk-exfmq47h.js:473293-473415 placement
/**
 * modelPicker 选项里该模型的自定义 label。
 */
function getModelPickerLabel(model) {
  let trimmed = model.trim();
  let trimmed_2 = getCuratedModelPicker()
    ?.picker.options.find((option) => option.model.trim() === trimmed)
    ?.label?.trim();
  return trimmed_2 === "" ? undefined : trimmed_2;
}
//@ chunk-exfmq47h.js:473415-473568 placement
/**
 * modelPicker 选项里该模型的 behavesAs（按哪个已知模型对待）。
 */
function getModelPickerBehavesAs(model) {
  let normalized = normalizeModelId(model);
  if (normalized === "") return;
  let trimmed = getCuratedModelPicker()
    ?.picker.options.find((option) => normalizeModelId(option.model) === normalized)
    ?.behavesAs?.trim();
  return trimmed === undefined || trimmed === "" ? undefined : trimmed;
}
//@ chunk-exfmq47h.js:473568-473657 placement
/**
 * 是否有任一 modelPicker 选项设置了 behavesAs。
 */
function hasModelPickerBehavesAs() {
  return (
    getCuratedModelPicker()?.picker.options.some((option) => (option.behavesAs?.trim() ?? "") !== "") ?? false
  );
}
//@ chunk-exfmq47h.js:473657-474218 placement
/**
 * 注册模型知识回调（是否已知、是否模型 id、客户端拼写、身份拼写、behavesAs 等）供规范化使用（顶层副作用语句）。
 */
// deferred: uses MAX_LOOKUP_BUCKETS (./modelCatalog/catalogCapabilities.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-exfmq47h.js:473657", () => {
  MAX_LOOKUP_BUCKETS({
    isKnown: (value) =>
      isRecognizedCanonical(
        getCanonicalName(value, {
          identity: true,
        }),
      ),
    isModelId: (id) => getCatalogEntry(id) !== undefined || catalogIdForProviderModelId(id) !== undefined,
    isClientSpelling: isClientModelSpelling,
    clientSpellingGeneration: () =>
      `${[...getProviderState().providerCache.validatedModels].join(",")}|${getAdditionalModelOptionsCache()
        .map((option) => (typeof option.value === "string" ? option.value : ""))
        .join(
          ",",
        )}|${env.ANTHROPIC_CUSTOM_MODEL_OPTION ?? ""}|${Object.values(getSettingsModelOverrides() ?? {}).join(",")}`,
    identitySpelling: (model) => {
      let canonical = firstPartyNameToCanonical(strip1mSuffix(model.toLowerCase()).trim());
      return isRecognizedCanonical(canonical) ? canonical : (gatewayCatalogRowId(model) ?? canonical);
    },
    settingsBehavesAs: getModelPickerBehavesAs,
    hasSettingsBehavesAs: hasModelPickerBehavesAs,
    settingsGeneration: () => commandSyncNameState().policy,
    isRowNameable: hasProviderModelId,
    isModelOverrideValue: isModelOverrideTarget,
    namingGeneration: gatewayGeneration,
  });
});
//@ chunk-exfmq47h.js:474218-474283 placement
/**
 * 注册服务端能力查询：catalog 运行时说明了能力列表时以其为准（顶层副作用语句）。
 */
// deferred: uses setServedCapabilityLookup (./modelCatalog.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-exfmq47h.js:474218", () => {
  setServedCapabilityLookup((capability, modelIds) => {
    let result = matchesCatalogList(capability, ...modelIds);
    return result === false && !anyModelDescribed(...modelIds) ? undefined : result;
  });
});
//@ chunk-exfmq47h.js:474283-474377 placement
/**
 * 服务端目录对该模型 eager_input_streaming 的设置（仅在模型被描述时）。
 */
function statedEagerInputStreaming(model) {
  let canonical = strippedCanonicalName(model);
  let eagerInputStreaming = servedRuntime(model, canonical)?.eager_input_streaming;
  return eagerInputStreaming != null && anyModelDescribed(model, canonical) ? eagerInputStreaming : undefined;
}
//@ chunk-exfmq47h.js:474377-474863 placement
/**
 * 模型显示名：modelPicker 标签 → 服务端目录名（机密时打码）→ 网关/附加模型选项标签 → catalog display_name → 原始字符串。
 */
function renderModelName(model) {
  let modelPickerLabel = getModelPickerLabel(model);
  if (modelPickerLabel !== undefined) return modelPickerLabel;
  let stripped = stripAnyVersatileSuffix(model);
  if (findModelConfigById(stripped) === null) {
    let entry =
      isPublishedCatalogInUse() && getPublicModelDisplayName(model) !== null
        ? undefined
        : findEffectiveServedEntry(
            stripped,
            getCanonicalName(stripped, {
              identity: true,
            }),
          );
    if (entry !== undefined) {
      let servedName = sanitizeTitle(entry.name ?? "");
      if (servedName) return servedName;
      if (entry.confidential === true) {
        let codename = sanitizeTitle(maskModelCodename(strip1mSuffix(entry.id)));
        if (codename) return codename;
      }
    }
    let matches = (option) =>
      typeof option.value === "string" && stripAnyVersatileSuffix(option.value) === stripped;
    let found = getGatewayModelOptions().find(matches);
    let option =
      found ?? (isServedCatalogActive() ? undefined : getAdditionalModelOptionsCache().find(matches));
    if (option?.label) {
      if (option === found && isSanitizedModelOption(option))
        return nameForUnnamedModelId(option.value) ?? option.label;
      return option.label;
    }
  }
  let publicModelDisplayName = getPublicModelDisplayName(model);
  if (publicModelDisplayName) return publicModelDisplayName;
  return sanitizeTitle(model) || "unknown model";
}
//@ chunk-exfmq47h.js:474863-475019 placement
/**
 * 模型族显示名（Fable/Haiku/Mythos/Opus/Sonnet）。
 */
function getModelFamilyName(model) {
  if (isFableFamilyOrPinnedModel(model)) return "Fable";
  let canonicalName = getCanonicalName(model);
  let family = getCatalogEntry(canonicalName)?.family;
  return DEFAULT_MODEL_FAMILY_NAMES.find((name) => {
    let lower = name.toLowerCase();
    return lower === family || canonicalName.startsWith(`claude-${lower}-`);
  });
}
//@ chunk-exfmq47h.js:475019-475223 placement
/**
 * 族名在 GrowthBook tengu_calm_seal 列表中（只走 usage credits 的族）时返回族名；Fable 直接返回。
 */
function usageCreditsOnlyFamily(model) {
  let modelFamilyName = getModelFamilyName(model);
  if (modelFamilyName === undefined || modelFamilyName === "Fable") return modelFamilyName;
  let featureValue_CACHED_MAY_BE_STALE = getFeatureValue_CACHED_MAY_BE_STALE("tengu_calm_seal", null);
  return Array.isArray(featureValue_CACHED_MAY_BE_STALE) &&
    featureValue_CACHED_MAY_BE_STALE.some(
      (family) => typeof family === "string" && family.trim().toLowerCase() === modelFamilyName.toLowerCase(),
    )
    ? modelFamilyName
    : undefined;
}
//@ chunk-exfmq47h.js:475223-475261 placement
/**
 * 模型族是否只能走 usage credits。
 */
function isUsageCreditsOnlyModel(model) {
  return usageCreditsOnlyFamily(model) !== undefined;
}
//@ chunk-exfmq47h.js:475261-475339 placement
/**
 * 模型短名：族名或带版本的显示名（同族时）。
 */
function renderUsageCreditsOnlyModelName(model) {
  let family = getModelFamilyName(model) ?? "Fable";
  let publicModelDisplayName = getPublicModelDisplayName(strip1mSuffix(model));
  return isProbeWrittenValue(publicModelDisplayName) && firstWord(publicModelDisplayName) === family
    ? publicModelDisplayName
    : family;
}
//@ chunk-exfmq47h.js:475339-475414 placement (2.1.88 match: getPublicModelName, 1)
/**
 * 公开模型名 "Claude <显示名>"，未知时 "Claude (<id>)"。
 */
function getPublicModelName(model) {
  let publicName = getPublicModelDisplayName(model);
  if (publicName) return `Claude ${publicName}`;
  return `Claude (${model})`;
}
//@ chunk-exfmq47h.js:475414-475450 placement
/**
 * 用户模型设置解析为具体模型 id（parseUserSpecifiedModel 后再做自定义拼写回映）。
 */
function parseUserSpecifiedModel(setting) {
  return identityModelId(strip1mTagWhereBuiltIn(resolveModelAliasSetting(setting)));
}
export {
  bytesPerTokenForModel,
  renderModelName,
  parseUserSpecifiedModel,
  isUsageCreditsOnlyModel,
  getPublicModelDisplayName,
  getPublicModelName,
  isOpus1mMergeEnabled,
  renderUsageCreditsOnlyModelName,
  opus1mMergeAddsTagTo,
  statedEagerInputStreaming,
  getCuratedModelPicker,
  getClaudeAiUserDefaultModelDescription,
  getCatalogDisplayName,
  usageCreditsOnlyFamily,
  renderDefaultModelSetting,
  renderModelSetting,
  opus1mMergeTagsDefaultOpus,
  getModelSourceAnnotation,
  getModelPricingSuffix,
  isOpusDefaultSubscriber,
  maskModelCodename,
  applyOpus1mOptIn,
};
