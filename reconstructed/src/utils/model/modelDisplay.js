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
  Bi,
  yn,
  strip1mTagWhereBuiltIn,
  isModelOverrideTarget,
  nameForUnnamedModelId,
  isFableFamilyOrPinnedModel,
  resolveModelAliasSetting,
} from "./model.js";
import { Nb, Lt, Bn } from "./modelIds.js";
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
  lb,
  isPublishedCatalogInUse,
  matchesCatalogList,
  dn,
  UUe,
  Vte,
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
import { Hb, anyModelDescribed } from "./modelCatalog/catalogCapabilities.js";
import { getProviderState, findModelConfigById } from "./providerCaches.js";
import { tf, oS, ef } from "../../services/gateway/hostCheck.js";
import { is } from "../settings/commandSyncNames.js";
import { sanitizeTitle } from "../resultError.js";
import { getGatewayModelOptions, qto } from "../../services/gateway/gatewayDiscovery.js";
import { dmr, isProbeWrittenValue, firstWord } from "./thirdPartyModelDefaults.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../../services/analytics/growthbook.js";
import { nI } from "./bedrock.js";

/**
 * 判断字符串是否为客户端可用的模型写法（别名、模型 ID、default、inherit 等）；供 utils/model 的 isClientSpelling 使用（共享指纹误归 agentDisplay）。
 */
//@ chunk-aepeg2w5.js:429417-429528 placement = resolveAgentModelDisplay (1)
function isClientModelSpelling(agent) {
  let n = normalizeModelSpelling(agent);
  if (n === "") return !1;
  return (
    Nb(n) ||
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
  let n = parseUserSpecifiedModel(e),
    replaced = Lt(getCanonicalName(n)).replace(/[._]/g, "-");
  return LEGACY_SUBAGENT_MODEL_IDS.has(replaced) ? 4 : 3;
}
//@ chunk-aepeg2w5.js:459792-460412 placement
function getClaudeAiUserDefaultModelDescription(e = !1) {
  let { setting: setting, attribution: attribution } = resolveDefaultMainLoopModelSetting();
  if (attribution === "served") {
    let h = getMarketingNameForModel(Bn(setting)) ?? renderModelName(setting),
      y = lb(setting) ?? modelFamilyOf(setting, getCanonicalName(parseUserSpecifiedModel(setting))),
      S =
        y === "opus"
          ? " \xB7 Best for everyday, complex tasks"
          : y === "sonnet"
            ? " \xB7 Efficient for routine tasks"
            : "",
      w =
        isFastModeOnForModel(e, setting) && supportsFastMode(setting)
          ? getModelPricingSuffix(!0, setting)
          : "";
    return `${h}${S}${w}`;
  }
  if (attribution !== "tier")
    return `${getMarketingNameForModel(Bn(parseUserSpecifiedModel(setting))) ?? renderModelName(setting)}${defaultModelAttributionSuffix(attribution)}`;
  if (isOpusDefaultSubscriber()) {
    let h = getDefaultOpusModel(),
      y = getMarketingNameForModel(Bn(h)) ?? "Opus",
      S = isFastModeOnForModel(e, h) && supportsFastMode(h);
    if (opus1mMergeAddsTagTo(h))
      return `${y} with 1M context \xB7 Best for everyday, complex tasks${S ? getModelPricingSuffix(!0, h) : ""}`;
    return `${y} \xB7 Best for everyday, complex tasks${S ? getModelPricingSuffix(!0, h) : ""}`;
  }
  return `${getMarketingNameForModel(Bn(getDefaultSonnetModel())) ?? "Sonnet"} \xB7 Efficient for routine tasks`;
}
//@ chunk-aepeg2w5.js:460412-460502 placement
function renderDefaultModelSetting(e) {
  if (e === "opusplan") return "Opus in plan mode, else Sonnet";
  return renderModelName(parseUserSpecifiedModel(e));
}
//@ chunk-aepeg2w5.js:460502-460634 placement
function getModelPricingSuffix(e, n) {
  if (!usesFirstPartyPricing()) return "";
  let r = firstPartyNameToCanonical(n),
    s = e ? formatModelPricing(getFastModeCosts(r)) : getModelPricingDisplay(r);
  if (s === void 0) return "";
  return ` \xB7${e ? ` (${LIGHTNING})` : ""} ${s}`;
}
/**
 * 是否可用 Opus：max 恒可；team 需 premium 或特性未限制；enterprise 需按量计费或未限制；pro 视特性。
 */
//@ chunk-aepeg2w5.js:460634-460789 placement = hasOpusAccess (1)
function isOpusDefaultSubscriber() {
  switch (getSubscriptionType()) {
    case "max":
      return !0;
    case "team":
      return isTeamPremiumSubscriber() || !isSonnetOnlySteering();
    case "enterprise":
      return isEnterprisePAYGSubscriber() || !isSonnetOnlySteering();
    case "pro":
      return !isSonnetOnlySteering();
    default:
      return !1;
  }
}
/**
 * Opus 1M 合并是否启用：未禁 1M、非 Pro、第一方；订阅用户需有订阅类型；默认 Opus 不能是 never 支持 1M 的模型。
 */
//@ chunk-aepeg2w5.js:460789-461009 placement = isOpus1mMergeEnabled (0.408)
function isOpus1mMergeEnabled() {
  if (is1mContextDisabled() || isProSubscriber() || getAPIProvider() !== "firstParty") return !1;
  if (isClaudeAISubscriber() && getSubscriptionType() === null) return !1;
  if (env.ANTHROPIC_DEFAULT_OPUS_MODEL === void 0) {
    let e = Bi("opus");
    if (e !== void 0 && get1mContextSupport(e) === "never" && !(isPublishedCatalogInUse() && e === yn()))
      return !1;
  }
  return !0;
}
/**
 * 合并启用且该模型 1M 模式为 optIn。
 */
//@ chunk-aepeg2w5.js:461009-461055 placement
function opus1mMergeAddsTagTo(e) {
  return isOpus1mMergeEnabled() && get1mContextSupport(e) === "optIn";
}
/**
 * 默认 Opus 的 1M 模式为 optIn（此时 opus 默认带 [1m]）。
 */
//@ chunk-aepeg2w5.js:461055-461103 placement
function opus1mMergeTagsDefaultOpus() {
  return isOpus1mMergeEnabled() && get1mContextSupport(getDefaultOpusModel()) === "optIn";
}
/**
 * optIn 时给模型加 [1m]。
 */
//@ chunk-aepeg2w5.js:461103-461140 placement
function applyOpus1mOptIn(e) {
  return opus1mMergeAddsTagTo(e) ? append1mSuffixIfMissing(e) : e;
}
/**
 * 设置值的显示：opusplan 显示 "Opus Plan"，别名显示解析后模型名，否则直接显示名。
 */
//@ chunk-aepeg2w5.js:461140-461230 placement = renderModelSetting (1)
function renderModelSetting(setting) {
  if (setting === "opusplan") return "Opus Plan";
  if (Nb(setting)) return renderModelName(parseUserSpecifiedModel(setting));
  return renderModelName(setting);
}
/**
 * 模型来自项目设置或托管设置时返回 " (from …)"；有会话覆盖或 ANTHROPIC_MODEL 时为空。
 */
//@ chunk-aepeg2w5.js:461230-461456 placement
function getModelSourceAnnotation() {
  if (getMainLoopModelOverride() !== void 0) return "";
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
/**
 * 规范名在 catalog 的 display_name（[1m] 且支持时加 " (1M context)"）。旧版名 resolveSkillModelOverride_5 为错配。
 */
//@ chunk-aepeg2w5.js:461456-461525 placement = resolveSkillModelOverride (0.834)
function getPublicModelDisplayName(e) {
  return getCatalogDisplayName(
    getCanonicalName(e, { identity: !0 }),
    strip1mTagWhereBuiltIn(e).endsWith("[1m]"),
  );
}
/**
 * catalog display_name，带 [1m] 且 supports_1m_suffix 时加 " (1M context)"。
 */
//@ chunk-aepeg2w5.js:461525-461654 placement
function getCatalogDisplayName(e, n) {
  let r = getCatalogEntry(e);
  if (!r) return null;
  let s = n && r.context?.supports_1m_suffix ? " (1M context)" : "";
  return r.display_name + s;
}
/**
 * 机密模型代号只露前三个字母，其余换成星号。
 */
//@ chunk-aepeg2w5.js:461654-461769 placement
function maskModelCodename(e) {
  let [n = "", ...r] = e.split("-");
  return [n.slice(0, 3) + "*".repeat(Math.max(0, n.length - 3)), ...r].join("-");
}
/**
 * 已启用设置源里第一个 modelPicker 配置及其来源。
 */
//@ chunk-aepeg2w5.js:461769-461896 placement
function getCuratedModelPicker() {
  let e = getEnabledSettingSources(),
    found = getSecuritySensitiveSettingWithSources("modelPicker").find((r) => e.includes(r.source));
  return found ? { picker: found.value, source: found.source } : void 0;
}
/**
 * modelPicker 选项里该模型的自定义 label。
 */
//@ chunk-aepeg2w5.js:461896-462018 placement
function getModelPickerLabel(e) {
  let trimmed = e.trim(),
    r = getCuratedModelPicker()
      ?.picker.options.find((s) => s.model.trim() === trimmed)
      ?.label?.trim();
  return r === "" ? void 0 : r;
}
/**
 * modelPicker 选项里该模型的 behavesAs（按哪个已知模型对待）。
 */
//@ chunk-aepeg2w5.js:462018-462171 placement
function getModelPickerBehavesAs(e) {
  let n = normalizeModelId(e);
  if (n === "") return;
  let r = getCuratedModelPicker()
    ?.picker.options.find((s) => normalizeModelId(s.model) === n)
    ?.behavesAs?.trim();
  return r === void 0 || r === "" ? void 0 : r;
}
/**
 * 是否有任一 modelPicker 选项设置了 behavesAs。
 */
//@ chunk-aepeg2w5.js:462171-462260 placement
function hasModelPickerBehavesAs() {
  return getCuratedModelPicker()?.picker.options.some((e) => (e.behavesAs?.trim() ?? "") !== "") ?? !1;
}
/**
 * 注册模型知识回调（是否已知、是否模型 id、客户端拼写、身份拼写、behavesAs 等）供规范化使用（顶层副作用语句）。
 */
//@ chunk-aepeg2w5.js:462260-462820 placement
Hb({
  isKnown: (e) => isRecognizedCanonical(getCanonicalName(e, { identity: !0 })),
  isModelId: (e) => getCatalogEntry(e) !== void 0 || catalogIdForProviderModelId(e) !== void 0,
  isClientSpelling: isClientModelSpelling,
  clientSpellingGeneration: () =>
    `${[...getProviderState().providerCache.validatedModels].join(",")}|${getAdditionalModelOptionsCache()
      .map((e) => (typeof e.value === "string" ? e.value : ""))
      .join(
        ",",
      )}|${env.ANTHROPIC_CUSTOM_MODEL_OPTION ?? ""}|${Object.values(getSettingsModelOverrides() ?? {}).join(",")}`,
  identitySpelling: (e) => {
    let n = firstPartyNameToCanonical(Lt(e.toLowerCase()).trim());
    return isRecognizedCanonical(n) ? n : (tf(e) ?? n);
  },
  settingsBehavesAs: getModelPickerBehavesAs,
  hasSettingsBehavesAs: hasModelPickerBehavesAs,
  settingsGeneration: () => is().policy,
  isRowNameable: oS,
  isModelOverrideValue: isModelOverrideTarget,
  namingGeneration: ef,
});
/**
 * 注册服务端能力查询：catalog 运行时说明了能力列表时以其为准（顶层副作用语句）。
 */
//@ chunk-aepeg2w5.js:462820-462885 placement
setServedCapabilityLookup((e, n) => {
  let r = matchesCatalogList(e, ...n);
  return r === !1 && !anyModelDescribed(...n) ? void 0 : r;
});
/**
 * 服务端目录对该模型 eager_input_streaming 的设置（仅在模型被描述时）。
 */
//@ chunk-aepeg2w5.js:462885-462979 placement
function statedEagerInputStreaming(e) {
  let n = strippedCanonicalName(e),
    r = dn(e, n)?.eager_input_streaming;
  return r != null && anyModelDescribed(e, n) ? r : void 0;
}
/**
 * 模型显示名：modelPicker 标签 → 服务端目录名（机密时打码）→ 网关/附加模型选项标签 → catalog display_name → 原始字符串。
 */
//@ chunk-aepeg2w5.js:462979-463465 placement
function renderModelName(e) {
  let n = getModelPickerLabel(e);
  if (n !== void 0) return n;
  let r = Bn(e);
  if (findModelConfigById(r) === null) {
    let h =
      isPublishedCatalogInUse() && getPublicModelDisplayName(e) !== null
        ? void 0
        : UUe(r, getCanonicalName(r, { identity: !0 }));
    if (h !== void 0) {
      let R = sanitizeTitle(h.name ?? "");
      if (R) return R;
      if (h.confidential === !0) {
        let x = sanitizeTitle(maskModelCodename(Lt(h.id)));
        if (x) return x;
      }
    }
    let y = (R) => typeof R.value === "string" && Bn(R.value) === r,
      found = getGatewayModelOptions().find(y),
      w = found ?? (Vte() ? void 0 : getAdditionalModelOptionsCache().find(y));
    if (w?.label) {
      if (w === found && qto(w)) return nameForUnnamedModelId(w.value) ?? w.label;
      return w.label;
    }
  }
  let s = getPublicModelDisplayName(e);
  if (s) return s;
  return sanitizeTitle(e) || "unknown model";
}
/**
 * 模型族显示名（Fable/Haiku/Mythos/Opus/Sonnet）。
 */
//@ chunk-aepeg2w5.js:463465-463621 placement
function getModelFamilyName(e) {
  if (isFableFamilyOrPinnedModel(e)) return "Fable";
  let n = getCanonicalName(e),
    r = getCatalogEntry(n)?.family;
  return dmr.find((s) => {
    let lower = s.toLowerCase();
    return lower === r || n.startsWith(`claude-${lower}-`);
  });
}
/**
 * 族名在 GrowthBook tengu_calm_seal 列表中（只走 usage credits 的族）时返回族名；Fable 直接返回。
 */
//@ chunk-aepeg2w5.js:463621-463825 placement
function usageCreditsOnlyFamily(e) {
  let n = getModelFamilyName(e);
  if (n === void 0 || n === "Fable") return n;
  let r = getFeatureValue_CACHED_MAY_BE_STALE("tengu_calm_seal", null);
  return Array.isArray(r) &&
    r.some((s) => typeof s === "string" && s.trim().toLowerCase() === n.toLowerCase())
    ? n
    : void 0;
}
/**
 * 模型族是否只能走 usage credits。
 */
//@ chunk-aepeg2w5.js:463825-463863 placement
function isUsageCreditsOnlyModel(e) {
  return usageCreditsOnlyFamily(e) !== void 0;
}
/**
 * 模型短名：族名或带版本的显示名（同族时）。
 */
//@ chunk-aepeg2w5.js:463863-463941 placement
function renderUsageCreditsOnlyModelName(e) {
  let n = getModelFamilyName(e) ?? "Fable",
    r = getPublicModelDisplayName(Lt(e));
  return isProbeWrittenValue(r) && firstWord(r) === n ? r : n;
}
/**
 * 公开模型名 "Claude <显示名>"，未知时 "Claude (<id>)"。
 */
//@ chunk-aepeg2w5.js:463941-464016 placement = getPublicModelName (1)
function getPublicModelName(model) {
  let publicName = getPublicModelDisplayName(model);
  if (publicName) return `Claude ${publicName}`;
  return `Claude (${model})`;
}
/**
 * 用户模型设置解析为具体模型 id（parseUserSpecifiedModel 后再做自定义拼写回映）。
 */
//@ chunk-aepeg2w5.js:464016-464052 placement
function parseUserSpecifiedModel(e) {
  return nI(strip1mTagWhereBuiltIn(resolveModelAliasSetting(e)));
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
