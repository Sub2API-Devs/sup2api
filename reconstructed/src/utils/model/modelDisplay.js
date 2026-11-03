/**
 * utils/model/modelDisplay.ts
 *
 * 2.1.316 新增：模型显示名与模型选择器条目（订阅类型、Fable、[1m]）。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-aepeg2w5.js (29)
 * attribution: placement 29
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
import { LIGHTNING } from "../permissions/autoModeRulesPrompt.js";
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
  getEffectiveSettingSource_2,
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

//@ chunk-aepeg2w5.js:429417-429528 placement = resolveAgentModelDisplay (1)
/**
 * 判断字符串是否为客户端可用的模型写法（别名、模型 ID、default、inherit 等）；供 utils/model 的 isClientSpelling 使用（共享指纹误归 agentDisplay）。
 */
function isClientModelSpelling(agent) {
  let n = normalizeModelSpelling(agent);
  if (n === "") return false;
  return (
    isModelKeyAlias(n) ||
    isModeDependentModelSetting(n) ||
    isOpusFableAdvisorSetting(n) ||
    n === "default" ||
    n === "inherit" ||
    isKnownCustomModel(n)
  );
}
//@ chunk-aepeg2w5.js:459696-459792 placement
function bytesPerTokenForModel(e) {
  if (!e) return 4;
  let userSpecifiedModel = parseUserSpecifiedModel(e);
  let replaced = strip1mSuffix(getCanonicalName(userSpecifiedModel)).replace(/[._]/g, "-");
  return LEGACY_SUBAGENT_MODEL_IDS.has(replaced) ? 4 : 3;
}
//@ chunk-aepeg2w5.js:459792-460412 placement
function getClaudeAiUserDefaultModelDescription(fastMode = false) {
  let { setting, attribution } = resolveDefaultMainLoopModelSetting();
  if (attribution === "served") {
    let h = getMarketingNameForModel(stripAnyVersatileSuffix(setting)) ?? renderModelName(setting);
    let y =
      servedRowFamily(setting) ?? modelFamilyOf(setting, getCanonicalName(parseUserSpecifiedModel(setting)));
    let S =
      y === "opus"
        ? " \xB7 Best for everyday, complex tasks"
        : y === "sonnet"
          ? " \xB7 Efficient for routine tasks"
          : "";
    let w =
      isFastModeOnForModel(fastMode, setting) && supportsFastMode(setting)
        ? getModelPricingSuffix(true, setting)
        : "";
    return `${h}${S}${w}`;
  }
  if (attribution !== "tier")
    return `${getMarketingNameForModel(stripAnyVersatileSuffix(parseUserSpecifiedModel(setting))) ?? renderModelName(setting)}${defaultModelAttributionSuffix(attribution)}`;
  if (isOpusDefaultSubscriber()) {
    let defaultOpusModel = getDefaultOpusModel();
    let y = getMarketingNameForModel(stripAnyVersatileSuffix(defaultOpusModel)) ?? "Opus";
    let S = isFastModeOnForModel(fastMode, defaultOpusModel) && supportsFastMode(defaultOpusModel);
    if (opus1mMergeAddsTagTo(defaultOpusModel))
      return `${y} with 1M context \xB7 Best for everyday, complex tasks${S ? getModelPricingSuffix(true, defaultOpusModel) : ""}`;
    return `${y} \xB7 Best for everyday, complex tasks${S ? getModelPricingSuffix(true, defaultOpusModel) : ""}`;
  }
  return `${getMarketingNameForModel(stripAnyVersatileSuffix(getDefaultSonnetModel())) ?? "Sonnet"} \xB7 Efficient for routine tasks`;
}
//@ chunk-aepeg2w5.js:460412-460502 placement
function renderDefaultModelSetting(e) {
  if (e === "opusplan") return "Opus in plan mode, else Sonnet";
  return renderModelName(parseUserSpecifiedModel(e));
}
//@ chunk-aepeg2w5.js:460502-460634 placement
function getModelPricingSuffix(e, n) {
  if (!usesFirstPartyPricing()) return "";
  let r = firstPartyNameToCanonical(n);
  let s = e ? formatModelPricing(getFastModeCosts(r)) : getModelPricingDisplay(r);
  if (s === undefined) return "";
  return ` \xB7${e ? ` (${LIGHTNING})` : ""} ${s}`;
}
//@ chunk-aepeg2w5.js:460634-460789 placement = hasOpusAccess (1)
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
//@ chunk-aepeg2w5.js:460789-461009 placement = isOpus1mMergeEnabled (0.408)
/**
 * Opus 1M 合并是否启用：未禁 1M、非 Pro、第一方；订阅用户需有订阅类型；默认 Opus 不能是 never 支持 1M 的模型。
 */
function isOpus1mMergeEnabled() {
  if (is1mContextDisabled() || isProSubscriber() || getAPIProvider() !== "firstParty") return false;
  if (isClaudeAISubscriber() && getSubscriptionType() === null) return false;
  if (env.ANTHROPIC_DEFAULT_OPUS_MODEL === undefined) {
    let e = tierOverrideModel("opus");
    if (
      e !== undefined &&
      get1mContextSupport(e) === "never" &&
      !(isPublishedCatalogInUse() && e === getDefaultOpusBuiltin())
    )
      return false;
  }
  return true;
}
//@ chunk-aepeg2w5.js:461009-461055 placement
/**
 * 合并启用且该模型 1M 模式为 optIn。
 */
function opus1mMergeAddsTagTo(e) {
  return isOpus1mMergeEnabled() && get1mContextSupport(e) === "optIn";
}
//@ chunk-aepeg2w5.js:461055-461103 placement
/**
 * 默认 Opus 的 1M 模式为 optIn（此时 opus 默认带 [1m]）。
 */
function opus1mMergeTagsDefaultOpus() {
  return isOpus1mMergeEnabled() && get1mContextSupport(getDefaultOpusModel()) === "optIn";
}
//@ chunk-aepeg2w5.js:461103-461140 placement
/**
 * optIn 时给模型加 [1m]。
 */
function applyOpus1mOptIn(defaultOpusModel) {
  return opus1mMergeAddsTagTo(defaultOpusModel)
    ? append1mSuffixIfMissing(defaultOpusModel)
    : defaultOpusModel;
}
//@ chunk-aepeg2w5.js:461140-461230 placement = renderModelSetting (1)
/**
 * 设置值的显示：opusplan 显示 "Opus Plan"，别名显示解析后模型名，否则直接显示名。
 */
function renderModelSetting(setting) {
  if (setting === "opusplan") return "Opus Plan";
  if (isModelKeyAlias(setting)) return renderModelName(parseUserSpecifiedModel(setting));
  return renderModelName(setting);
}
//@ chunk-aepeg2w5.js:461230-461456 placement
/**
 * 模型来自项目设置或托管设置时返回 " (from …)"；有会话覆盖或 ANTHROPIC_MODEL 时为空。
 */
function getModelSourceAnnotation() {
  if (getMainLoopModelOverride() !== undefined) return "";
  if (env.ANTHROPIC_MODEL) return "";
  switch (getEffectiveSettingSource_2("model")) {
    case "projectSettings":
      return ` (from ${getRelativeSettingsFilePathForSource("projectSettings")})`;
    case "policySettings":
      return " (from managed settings)";
    default:
      return "";
  }
}
//@ chunk-aepeg2w5.js:461456-461525 placement = resolveSkillModelOverride (0.834)
/**
 * 规范名在 catalog 的 display_name（[1m] 且支持时加 " (1M context)"）。旧版名 resolveSkillModelOverride_5 为错配。
 */
function getPublicModelDisplayName(e) {
  return getCatalogDisplayName(
    getCanonicalName(e, {
      identity: true,
    }),
    strip1mTagWhereBuiltIn(e).endsWith("[1m]"),
  );
}
//@ chunk-aepeg2w5.js:461525-461654 placement
/**
 * catalog display_name，带 [1m] 且 supports_1m_suffix 时加 " (1M context)"。
 */
function getCatalogDisplayName(e, n) {
  let catalogEntry = getCatalogEntry(e);
  if (!catalogEntry) return null;
  let s = n && catalogEntry.context?.supports_1m_suffix ? " (1M context)" : "";
  return catalogEntry.display_name + s;
}
//@ chunk-aepeg2w5.js:461654-461769 placement
/**
 * 机密模型代号只露前三个字母，其余换成星号。
 */
function maskModelCodename(baseName) {
  let [codename = "", ...rest] = baseName.split("-");
  return [codename.slice(0, 3) + "*".repeat(Math.max(0, codename.length - 3)), ...rest].join("-");
}
//@ chunk-aepeg2w5.js:461769-461896 placement
/**
 * 已启用设置源里第一个 modelPicker 配置及其来源。
 */
function getCuratedModelPicker() {
  let enabledSettingSources = getEnabledSettingSources();
  let found = getSecuritySensitiveSettingWithSources("modelPicker").find((r) =>
    enabledSettingSources.includes(r.source),
  );
  return found
    ? {
        picker: found.value,
        source: found.source,
      }
    : undefined;
}
//@ chunk-aepeg2w5.js:461896-462018 placement
/**
 * modelPicker 选项里该模型的自定义 label。
 */
function getModelPickerLabel(e) {
  let trimmed = e.trim();
  let trimmed_2 = getCuratedModelPicker()
    ?.picker.options.find((option) => option.model.trim() === trimmed)
    ?.label?.trim();
  return trimmed_2 === "" ? undefined : trimmed_2;
}
//@ chunk-aepeg2w5.js:462018-462171 placement
/**
 * modelPicker 选项里该模型的 behavesAs（按哪个已知模型对待）。
 */
function getModelPickerBehavesAs(e) {
  let n = normalizeModelId(e);
  if (n === "") return;
  let trimmed = getCuratedModelPicker()
    ?.picker.options.find((option) => normalizeModelId(option.model) === n)
    ?.behavesAs?.trim();
  return trimmed === undefined || trimmed === "" ? undefined : trimmed;
}
//@ chunk-aepeg2w5.js:462171-462260 placement
/**
 * 是否有任一 modelPicker 选项设置了 behavesAs。
 */
function hasModelPickerBehavesAs() {
  return (
    getCuratedModelPicker()?.picker.options.some((option) => (option.behavesAs?.trim() ?? "") !== "") ?? false
  );
}
//@ chunk-aepeg2w5.js:462260-462820 placement
/**
 * 注册模型知识回调（是否已知、是否模型 id、客户端拼写、身份拼写、behavesAs 等）供规范化使用（顶层副作用语句）。
 */
MAX_LOOKUP_BUCKETS({
  isKnown: (e) =>
    isRecognizedCanonical(
      getCanonicalName(e, {
        identity: true,
      }),
    ),
  isModelId: (e) => getCatalogEntry(e) !== undefined || catalogIdForProviderModelId(e) !== undefined,
  isClientSpelling: isClientModelSpelling,
  clientSpellingGeneration: () =>
    `${[...getProviderState().providerCache.validatedModels].join(",")}|${getAdditionalModelOptionsCache()
      .map((e) => (typeof e.value === "string" ? e.value : ""))
      .join(
        ",",
      )}|${env.ANTHROPIC_CUSTOM_MODEL_OPTION ?? ""}|${Object.values(getSettingsModelOverrides() ?? {}).join(",")}`,
  identitySpelling: (e) => {
    let n = firstPartyNameToCanonical(strip1mSuffix(e.toLowerCase()).trim());
    return isRecognizedCanonical(n) ? n : (gatewayCatalogRowId(e) ?? n);
  },
  settingsBehavesAs: getModelPickerBehavesAs,
  hasSettingsBehavesAs: hasModelPickerBehavesAs,
  settingsGeneration: () => commandSyncNameState().policy,
  isRowNameable: hasProviderModelId,
  isModelOverrideValue: isModelOverrideTarget,
  namingGeneration: gatewayGeneration,
});
//@ chunk-aepeg2w5.js:462820-462885 placement
/**
 * 注册服务端能力查询：catalog 运行时说明了能力列表时以其为准（顶层副作用语句）。
 */
setServedCapabilityLookup((e, n) => {
  let r = matchesCatalogList(e, ...n);
  return r === false && !anyModelDescribed(...n) ? undefined : r;
});
//@ chunk-aepeg2w5.js:462885-462979 placement
/**
 * 服务端目录对该模型 eager_input_streaming 的设置（仅在模型被描述时）。
 */
function statedEagerInputStreaming(model) {
  let n = strippedCanonicalName(model);
  let eagerInputStreaming = servedRuntime(model, n)?.eager_input_streaming;
  return eagerInputStreaming != null && anyModelDescribed(model, n) ? eagerInputStreaming : undefined;
}
//@ chunk-aepeg2w5.js:462979-463465 placement
/**
 * 模型显示名：modelPicker 标签 → 服务端目录名（机密时打码）→ 网关/附加模型选项标签 → catalog display_name → 原始字符串。
 */
function renderModelName(e) {
  let modelPickerLabel = getModelPickerLabel(e);
  if (modelPickerLabel !== undefined) return modelPickerLabel;
  let r = stripAnyVersatileSuffix(e);
  if (findModelConfigById(r) === null) {
    let h =
      isPublishedCatalogInUse() && getPublicModelDisplayName(e) !== null
        ? undefined
        : findEffectiveServedEntry(
            r,
            getCanonicalName(r, {
              identity: true,
            }),
          );
    if (h !== undefined) {
      let R = sanitizeTitle(h.name ?? "");
      if (R) return R;
      if (h.confidential === true) {
        let x = sanitizeTitle(maskModelCodename(strip1mSuffix(h.id)));
        if (x) return x;
      }
    }
    let y = (R) => typeof R.value === "string" && stripAnyVersatileSuffix(R.value) === r;
    let found = getGatewayModelOptions().find(y);
    let w = found ?? (isServedCatalogActive() ? undefined : getAdditionalModelOptionsCache().find(y));
    if (w?.label) {
      if (w === found && isSanitizedModelOption(w)) return nameForUnnamedModelId(w.value) ?? w.label;
      return w.label;
    }
  }
  let publicModelDisplayName = getPublicModelDisplayName(e);
  if (publicModelDisplayName) return publicModelDisplayName;
  return sanitizeTitle(e) || "unknown model";
}
//@ chunk-aepeg2w5.js:463465-463621 placement
/**
 * 模型族显示名（Fable/Haiku/Mythos/Opus/Sonnet）。
 */
function getModelFamilyName(e) {
  if (isFableFamilyOrPinnedModel(e)) return "Fable";
  let canonicalName = getCanonicalName(e);
  let family = getCatalogEntry(canonicalName)?.family;
  return DEFAULT_MODEL_FAMILY_NAMES.find((s) => {
    let lower = s.toLowerCase();
    return lower === family || canonicalName.startsWith(`claude-${lower}-`);
  });
}
//@ chunk-aepeg2w5.js:463621-463825 placement
/**
 * 族名在 GrowthBook tengu_calm_seal 列表中（只走 usage credits 的族）时返回族名；Fable 直接返回。
 */
function usageCreditsOnlyFamily(e) {
  let modelFamilyName = getModelFamilyName(e);
  if (modelFamilyName === undefined || modelFamilyName === "Fable") return modelFamilyName;
  let featureValue_CACHED_MAY_BE_STALE = getFeatureValue_CACHED_MAY_BE_STALE("tengu_calm_seal", null);
  return Array.isArray(featureValue_CACHED_MAY_BE_STALE) &&
    featureValue_CACHED_MAY_BE_STALE.some(
      (s) => typeof s === "string" && s.trim().toLowerCase() === modelFamilyName.toLowerCase(),
    )
    ? modelFamilyName
    : undefined;
}
//@ chunk-aepeg2w5.js:463825-463863 placement
/**
 * 模型族是否只能走 usage credits。
 */
function isUsageCreditsOnlyModel(e) {
  return usageCreditsOnlyFamily(e) !== undefined;
}
//@ chunk-aepeg2w5.js:463863-463941 placement
/**
 * 模型短名：族名或带版本的显示名（同族时）。
 */
function renderUsageCreditsOnlyModelName(e) {
  let n = getModelFamilyName(e) ?? "Fable";
  let publicModelDisplayName = getPublicModelDisplayName(strip1mSuffix(e));
  return isProbeWrittenValue(publicModelDisplayName) && firstWord(publicModelDisplayName) === n
    ? publicModelDisplayName
    : n;
}
//@ chunk-aepeg2w5.js:463941-464016 placement = getPublicModelName (1)
/**
 * 公开模型名 "Claude <显示名>"，未知时 "Claude (<id>)"。
 */
function getPublicModelName(model) {
  let publicName = getPublicModelDisplayName(model);
  if (publicName) return `Claude ${publicName}`;
  return `Claude (${model})`;
}
//@ chunk-aepeg2w5.js:464016-464052 placement
/**
 * 用户模型设置解析为具体模型 id（parseUserSpecifiedModel 后再做自定义拼写回映）。
 */
function parseUserSpecifiedModel(setting) {
  return identityModelId(strip1mTagWhereBuiltIn(resolveModelAliasSetting(setting)));
}
export {
  bytesPerTokenForModel,
  parseUserSpecifiedModel,
  getCuratedModelPicker,
  getClaudeAiUserDefaultModelDescription,
  getCatalogDisplayName,
  getPublicModelDisplayName,
  renderModelName,
  isUsageCreditsOnlyModel,
  usageCreditsOnlyFamily,
  renderUsageCreditsOnlyModelName,
  getModelSourceAnnotation,
  isOpus1mMergeEnabled,
  renderDefaultModelSetting,
  renderModelSetting,
  opus1mMergeAddsTagTo,
  opus1mMergeTagsDefaultOpus,
  getModelPricingSuffix,
  isOpusDefaultSubscriber,
  maskModelCodename,
  applyOpus1mOptIn,
  statedEagerInputStreaming,
  getPublicModelName,
};
