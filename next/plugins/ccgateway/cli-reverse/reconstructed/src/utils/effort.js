/**
 * utils/effort.ts
 *
 * effort（推理强度）：级别 low/medium/high/xhigh/max、模型是否支持 effort/xhigh/max、默认 effort 的来源顺序、环境变量与 /effort 覆盖、组织上限截断、按模型保存的 effort 设置。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/effort.ts
 * pieces: chunk-5dqwe9kx.js (2), chunk-bc4jcw5z.js (100), chunk-czq1j3j2.js (2), chunk-n2cdp9nk.js (1), chunk-z20c443b.js (2)
 * attribution: placement 56, callgraph-fingerprint 4, layout 40, fingerprint 5, callgraph-witnessed 2
 */
import { resolve } from "path";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../services/analytics/growthbook.js";
import {
  TENGU_LOGGIA_PASSAGE,
  sameEffort,
  approvalLayers,
  getCarriedRefusalEffort,
  parseEffortOrKeyword,
  isReservedEffortKeyword,
} from "./permissions/permissionSetup.js";
import {
  getRefusalFallbackModelLatch,
  releaseRefusalFallbackCarriedEffort,
  isEffortMarkedUnsupported,
  getFlagSettingsInline,
  getFlagSettingsExpectedContent,
  getFlagSettingsFilePinnedContent,
  getIsNonInteractiveSession,
  getTotalOutputTokens,
  setMainLoopEffortState,
} from "../bootstrap/state.js";
import { getCapabilityOverrideCached } from "./model/modelSupportOverrides.js";
import { getCanonicalName } from "./model/canonicalModelName.js";
import { modelCapabilitiesEnvEntry, modelSupportsCapability, getCatalogEntry } from "./model/modelCatalog.js";
import { modelEffortLevels, servedDefaultEffort } from "./model/modelCatalog/servedCatalog.js";
import { env } from "./env.js";
import { hasFirstPartyCapabilities, getProviderForModel, getAPIProvider } from "./model/providers.js";
import { isWorkflowsAvailable } from "./workflows/workflowGates.js";
import {
  THINKING_DISABLED_EFFORT_CAP,
  resolveModelOptionValue,
  defaultEffortForModel,
} from "../components/ModelPicker.js";
import {
  getAllPolicyTierSettings,
  getSettingsForSource,
  getInitialSettings,
  getSettingsFilePathForSource,
  parseSettingsFile,
  updateSettingsForSource,
} from "./settings/settings.js";
import { getEnabledSettingSources } from "./settings/constants.js";
import { strip1mTag, resolveModelAliasSpelling } from "./model/model.js";
import {
  getModelAccessCache,
  getOrgModelDefaultCache,
  getOauthAccountInfo,
  isProSubscriber,
} from "./auth.js";
import {
  isRemoteSessionAvailable,
  isRemoteControlChannelAvailable,
  getRemoteCaps,
} from "../remote/remoteMode.js";
import { MAX_REQUEST_ID_LENGTH } from "./controlMessageCompat.js";
import { isStandardVersion, parseModelId, strip1mSuffix } from "./model/modelIds.js";
import { getGlobalConfig, getCachedClientData } from "./config.js";
import { isFableModel } from "./model/fableMitigations.js";
import { parseUserSpecifiedModel } from "./model/modelDisplay.js";
import { isAutoCompactOfferAnswered } from "../services/compact/autocompactOffer.js";
import { getDefaultMainLoopModel } from "./model/modelFallback.js";
import { usesPerTurnEffortBeta } from "./betas.js";
import { isUltrathinkEnabled } from "./thinking.js";
import { isVsCodeOrDesktop, getSessionEntrypoint, isDesktopTopNonClaudecode } from "./sessionShape.js";
import { REMOTE_ENTRYPOINT_NAMES } from "./entrypointKinds.js";
import { isTopLevelBridgeSession } from "./remoteEnvironment.js";
import { MAX_EFFORT_DESCRIPTION } from "./settings/permissionRuleCarveOut.js";
import { DoctorLazy } from "../cli/handlers/util.js";
import { record, stringSchema, unknown } from "../../vendor/zod/v4/classic/schemas.js";
import { safeParseJSON } from "./json.js";
import { hasEffortOverride, describeEffortLevel } from "../components/EffortSlider.js";
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-z20c443b.js:188527-188572 callgraph-witnessed (2.1.88 match: EFFORT_LEVELS, 0.879)
/**
 * effort 级别从低到高：low、medium、high、xhigh、max。
 */
var EFFORT_LEVELS = ["low", "medium", "high", "xhigh", "max"];
//@ chunk-z20c443b.js:188572-188625 placement
/**
 * 级别 a 是否高于 b（按 EFFORT_LEVELS 顺序）。
 */
function isEffortHigherThan(leftLevel, rightLevel) {
  return EFFORT_LEVELS.indexOf(leftLevel) > EFFORT_LEVELS.indexOf(rightLevel);
}
//@ chunk-bc4jcw5z.js:16358-16387 placement
function isEffortCarryDisabled() {
  return getFeatureValue_CACHED_MAY_BE_STALE(TENGU_LOGGIA_PASSAGE, false);
}
//@ chunk-bc4jcw5z.js:17018-17082 placement
/**
 * carriedEffortForModel：该模型可沿用的 effort。
 */
function carriedEffortForModel(model, loopEffort) {
  return loopEffort !== undefined && loopEffort.model === model ? loopEffort.level : undefined;
}
//@ chunk-bc4jcw5z.js:17082-17132 placement
/**
 * hasCarriedRefusalEffort：回退锁存里带了 effort。
 */
function hasCarriedRefusalEffort() {
  return getRefusalFallbackModelLatch()?.carriedEffort !== undefined;
}
//@ chunk-bc4jcw5z.js:17610-17646 placement
/**
 * releaseCarriedEffortForEffortChange：effort 改变时释放携带值。
 */
function releaseCarriedEffortForEffortChange() {
  releaseRefusalFallbackCarriedEffort("effort_change");
}
//@ chunk-bc4jcw5z.js:17646-17732 placement
/**
 * releaseCarriedEffortIfModelChanged：模型不再是回退模型时释放。
 */
function releaseCarriedEffortIfModelChanged(model) {
  let refusalFallbackModelLatch = getRefusalFallbackModelLatch();
  if (refusalFallbackModelLatch !== undefined && !sameEffort(model, refusalFallbackModelLatch.fallbackModel))
    releaseRefusalFallbackCarriedEffort("model_change");
}
//@ chunk-bc4jcw5z.js:17976-18000 placement
/**
 * isSpecialEffortKeywordDisabled：恒 false（构建时裁掉的关键字检查）。
 */
function isSpecialEffortKeywordDisabled() {
  return false;
}
//@ chunk-bc4jcw5z.js:18025-18476 callgraph-fingerprint (2.1.88 match: modelSupportsEffort, 0.2)
/**
 * 模型是否支持 effort：被 API 拒绝过的模型为 false；3P 能力覆盖 → CLAUDE_CODE_MODEL_CAPABILITIES → 服务端目录 effort_levels → 旧模型黑名单 → CLAUDE_CODE_ALWAYS_ENABLE_EFFORT → catalog 能力 effort → 第一方类提供商默认支持。
 */
function modelSupportsEffort(model) {
  if (isEffortMarkedUnsupported(model)) return false;
  let capabilityOverride = getCapabilityOverrideCached(model, "effort");
  if (capabilityOverride !== undefined) return capabilityOverride;
  let canonicalName = getCanonicalName(model);
  let supported3P = modelCapabilitiesEnvEntry("effort", canonicalName);
  if (supported3P !== undefined) return supported3P;
  let levels = modelEffortLevels(model, canonicalName);
  if (levels !== undefined) return levels.length > 0;
  if (
    canonicalName.includes("claude-3-") ||
    canonicalName === "claude-opus-4-0" ||
    canonicalName === "claude-opus-4-1" ||
    canonicalName === "claude-sonnet-4-0" ||
    canonicalName === "claude-sonnet-4-5" ||
    canonicalName === "claude-haiku-4-5"
  )
    return false;
  if (env.CLAUDE_CODE_ALWAYS_ENABLE_EFFORT) return true;
  if (modelSupportsCapability(canonicalName, "effort", model) || canonicalName === "claude-mythos-5")
    return true;
  return hasFirstPartyCapabilities(getProviderForModel(model));
}
//@ chunk-bc4jcw5z.js:18476-18924 callgraph-fingerprint (2.1.88 match: modelSupportsMaxEffort, 0.162)
/**
 * 模型是否支持 max effort，判定顺序同 modelSupportsEffort（能力 max_effort）。
 */
function modelSupportsMaxEffort(model) {
  if (isEffortMarkedUnsupported(model)) return false;
  let supported3P = getCapabilityOverrideCached(model, "max_effort");
  if (supported3P !== undefined) return supported3P;
  let canonicalName = getCanonicalName(model);
  let catalogEffortCapability = getCatalogEffortCapability("max_effort", model, canonicalName);
  if (catalogEffortCapability !== undefined) return catalogEffortCapability;
  let levels = modelEffortLevels(model, canonicalName);
  if (levels !== undefined) return levels.includes("max");
  if (
    canonicalName.includes("claude-3-") ||
    canonicalName === "claude-opus-4-0" ||
    canonicalName === "claude-opus-4-1" ||
    canonicalName === "claude-opus-4-5" ||
    canonicalName === "claude-sonnet-4-0" ||
    canonicalName === "claude-sonnet-4-5" ||
    canonicalName === "claude-haiku-4-5"
  )
    return false;
  if (modelSupportsCapability(canonicalName, "max_effort", model) || canonicalName === "claude-mythos-5")
    return true;
  return hasFirstPartyCapabilities(getProviderForModel(model));
}
//@ chunk-bc4jcw5z.js:18924-19428 placement
/**
 * 模型是否支持 xhigh effort：被 API 拒过 effort → 否；能力覆盖；catalog 能力 xhigh_effort；服务端 effort_levels；早于 opus-4-7 的老模型否；mythos-5 是；其余第一方系提供商是。
 */
function modelSupportsXhighEffort(model) {
  if (isEffortMarkedUnsupported(model)) return false;
  let capabilityOverride = getCapabilityOverrideCached(model, "xhigh_effort");
  if (capabilityOverride !== undefined) return capabilityOverride;
  let canonicalName = getCanonicalName(model);
  let catalogEffortCapability = getCatalogEffortCapability("xhigh_effort", model, canonicalName);
  if (catalogEffortCapability !== undefined) return catalogEffortCapability;
  let levels = modelEffortLevels(model, canonicalName);
  if (levels !== undefined) return levels.includes("xhigh");
  if (
    canonicalName.includes("claude-3-") ||
    canonicalName === "claude-opus-4-0" ||
    canonicalName === "claude-opus-4-1" ||
    canonicalName === "claude-opus-4-5" ||
    canonicalName === "claude-opus-4-6" ||
    canonicalName === "claude-sonnet-4-0" ||
    canonicalName === "claude-sonnet-4-5" ||
    canonicalName === "claude-sonnet-4-6" ||
    canonicalName === "claude-haiku-4-5"
  )
    return false;
  if (modelSupportsCapability(canonicalName, "xhigh_effort", model) || canonicalName === "claude-mythos-5")
    return true;
  return hasFirstPartyCapabilities(getProviderForModel(model));
}
//@ chunk-bc4jcw5z.js:19428-19532 placement
/**
 * catalog 能力查询，且 effort 能力没被关闭（effort=false 时直接 false）。
 */
function getCatalogEffortCapability(model, canonicalName, canonicalName_2) {
  if (modelCapabilitiesEnvEntry("effort", canonicalName_2) === false) return false;
  let entry = modelCapabilitiesEnvEntry(model, canonicalName_2);
  if (entry === undefined) return;
  return entry && modelSupportsEffort(canonicalName);
}
//@ chunk-bc4jcw5z.js:19532-19561 placement
/**
 * 同 modelSupportsXhighEffort（ultracode 映射到 xhigh）。
 */
function modelSupportsUltracode(model) {
  return modelSupportsXhighEffort(model);
}
//@ chunk-bc4jcw5z.js:19561-19609 placement
/**
 * 工作流（Workflow）可用且模型支持 xhigh（模型未给时只看工作流）。
 */
function isUltracodeAvailable(model) {
  return isWorkflowsAvailable() && (model === undefined || modelSupportsUltracode(model));
}
//@ chunk-bc4jcw5z.js:19609-19647 placement
/**
 * ultracode 设置为 true 且可用。
 */
function isUltracodeActive(ultracode, model) {
  return ultracode === true && isUltracodeAvailable(model);
}
//@ chunk-bc4jcw5z.js:19647-19817 placement
/**
 * 新 effort 与会话 effort（或当前生效值）是否不同（考虑上限夹取）。
 */
function isEffortChangedFromSession(model, session, effortValue) {
  if (session.sessionEffort?.kind === "level") {
    let sessionLevel = session.sessionEffort.value;
    return !(
      effortValue === sessionLevel ||
      (typeof effortValue === "string" &&
        isEffortLevel(effortValue) &&
        clampEffortToCap(effortValue, model) === sessionLevel)
    );
  }
  return (
    getEffortLevelOrHigh(model, resolveEffortLevel(session)) !== getEffortLevelOrHigh(model, effortValue)
  );
}
//@ chunk-bc4jcw5z.js:19817-19997 placement
/**
 * 请求的级别等于“带 hold 的生效 effort”且与不带 hold 时不同（即该级别只是被保持而来）。
 */
function isRequestedEffortTheHeldLevel(model, effortLevel, session) {
  if (session.sessionEffort?.kind === "level" || typeof effortLevel !== "string") return false;
  let effortValue = resolveEffortValue(model, resolveEffortLevel(session, model));
  let effortValue_2 = resolveEffortValue(
    model,
    resolveEffortLevel(session, model, {
      withHold: false,
    }),
    {
      carriedEffort: null,
    },
  );
  return parseEffortLevel(effortLevel) === effortValue && effortValue !== effortValue_2;
}
//@ chunk-bc4jcw5z.js:19997-20034 placement
/**
 * 是否是 low/medium/high/xhigh/max 之一（旧版同名）。
 */
function isEffortLevel(value) {
  return EFFORT_LEVELS.includes(value);
}
//@ chunk-bc4jcw5z.js:20034-20069 placement
/**
 * effort 级别在 EFFORT_LEVELS 中的序号。
 */
function effortRank(level) {
  return EFFORT_LEVELS.indexOf(level);
}
//@ chunk-bc4jcw5z.js:20084-20126 placement
/**
 * 级别高于 high（xhigh/max）。
 */
function isAboveHighEffort(level) {
  return isEffortLevel(level) && effortRank(level) > effortRank(THINKING_DISABLED_EFFORT_CAP);
}
//@ chunk-bc4jcw5z.js:20126-20221 placement
/**
 * thinking 关闭时是否限制 effort（catalog 能力 thinking_disabled_effort_cap，默认 opus-5）。
 */
function modelCapsEffortWhenThinkingDisabled(model) {
  let canonicalName = getCanonicalName(model);
  return (
    modelSupportsCapability(canonicalName, "thinking_disabled_effort_cap", model) ??
    canonicalName === "claude-opus-5"
  );
}
//@ chunk-bc4jcw5z.js:20221-20655 placement
/**
 * 各设置来源（含 modelSettings.<模型>.maxEffortLevel）中最严格的 maxEffortLevel；max 视为不设上限。
 */
function getSettingsMaxEffort(model) {
  let settingsList = [
    ...getAllPolicyTierSettings(),
    ...getEnabledSettingSources().map((source) => getSettingsForSource(source)),
    ...approvalLayers(),
  ];
  let hasPerModelCaps = settingsList.some((settings) =>
    Object.values(settings?.modelSettings ?? {}).some(
      (modelSettings) => modelSettings?.maxEffortLevel !== undefined,
    ),
  )
    ? getModelSettingsKey(model)
    : undefined;
  let lowestCap = null;
  for (let settings of settingsList) {
    if (!settings) continue;
    let cap;
    if (hasPerModelCaps !== undefined)
      for (let [key, value] of Object.entries(settings.modelSettings ?? {})) {
        let maxEffortLevel = value?.maxEffortLevel;
        if (
          maxEffortLevel !== undefined &&
          (cap === undefined || effortRank(maxEffortLevel) < effortRank(cap)) &&
          getModelSettingsKey(key) === hasPerModelCaps
        )
          cap = maxEffortLevel;
      }
    cap ??= settings.maxEffortLevel;
    if (cap !== undefined && cap !== "max" && (lowestCap === null || effortRank(cap) < effortRank(lowestCap)))
      lowestCap = cap;
  }
  return lowestCap;
}
//@ chunk-bc4jcw5z.js:20655-20966 placement
/**
 * 本模型的 effort 上限：设置上限与组织模型访问表（firstParty/gateway 的 maxEffortLevel）取更严格者；max 返回 null。
 */
function getEffortCap(model) {
  let settingsMaxEffort = getSettingsMaxEffort(model);
  let orgCap = null;
  let apiProvider = getAPIProvider();
  if (apiProvider === "firstParty" || apiProvider === "gateway") {
    let canonicalName = getCanonicalName(strip1mTag(model.trim().toLowerCase()), {
      identity: true,
    });
    let maxEffortLevel = getModelAccessCache().find(
      (entry) =>
        getCanonicalName(strip1mTag(entry.apiName.trim().toLowerCase()), {
          identity: true,
        }) === canonicalName,
    )?.maxEffortLevel;
    orgCap = maxEffortLevel != null && isEffortLevel(maxEffortLevel) ? maxEffortLevel : null;
  }
  let cap =
    orgCap === null
      ? settingsMaxEffort
      : settingsMaxEffort === null
        ? orgCap
        : effortRank(settingsMaxEffort) < effortRank(orgCap)
          ? settingsMaxEffort
          : orgCap;
  return cap === "max" ? null : cap;
}
//@ chunk-bc4jcw5z.js:20966-21232 placement
/**
 * 组织默认模型缓存与该模型一致时返回其 default_effort_level（仅第一方）。
 */
function getOrgDefaultEffort(model) {
  if (getAPIProvider() !== "firstParty") return null;
  let orgModelDefaultCache = getOrgModelDefaultCache();
  if (orgModelDefaultCache === null) return null;
  let defaultEffortLevel = orgModelDefaultCache.default_effort_level;
  if (defaultEffortLevel == null || !isEffortLevel(defaultEffortLevel)) return null;
  let canonicalName = getCanonicalName(strip1mTag(model.trim().toLowerCase()), {
    identity: true,
  });
  return getCanonicalName(strip1mTag(orgModelDefaultCache.name.trim().toLowerCase()), {
    identity: true,
  }) === canonicalName
    ? defaultEffortLevel
    : null;
}
//@ chunk-bc4jcw5z.js:21232-21303 placement
/**
 * 组织设置 override_user_effort 且该模型有组织默认 effort。
 */
function orgOverridesUserEffort(model) {
  return getOrgModelDefaultCache()?.override_user_effort === true && getOrgDefaultEffort(model) !== null;
}
//@ chunk-bc4jcw5z.js:21303-21362 placement
/**
 * 级别不超过上限（无上限为真）。
 */
function isEffortWithinCap(level, modelOptionValue) {
  let effortCap = getEffortCap(modelOptionValue);
  return effortCap === null || effortRank(level) <= effortRank(effortCap);
}
//@ chunk-bc4jcw5z.js:21362-21435 placement
/**
 * 上限以内的 effort 级别列表。
 */
function getAllowedEffortLevels(model) {
  let effortCap = getEffortCap(model);
  return EFFORT_LEVELS.filter((level) => effortCap === null || effortRank(level) <= effortRank(effortCap));
}
//@ chunk-bc4jcw5z.js:21435-21497 placement
/**
 * 超过上限时降到上限。
 */
function clampEffortToCap(level, model) {
  let effortCap = getEffortCap(model);
  return effortCap !== null && effortRank(level) > effortRank(effortCap) ? effortCap : level;
}
//@ chunk-bc4jcw5z.js:21497-21578 placement
/**
 * xhigh/max 需要模型支持，其他级别都可。
 */
function modelSupportsEffortLevel(model, level) {
  if (level === "xhigh") return modelSupportsXhighEffort(model);
  if (level === "max") return modelSupportsMaxEffort(model);
  return true;
}
//@ chunk-bc4jcw5z.js:21783-21833 placement
/**
 * 模型支持 effort、非受限会话且未被 CLAUDE_CODE_EFFORT_LEVEL 覆盖。
 */
function isEffortAdjustable(model) {
  return modelSupportsEffort(model) && !isRemoteSessionAvailable() && getEffortEnvOverride() === undefined;
}
//@ chunk-bc4jcw5z.js:21833-21869 placement
/**
 * isEffortAdjustable 且 GrowthBook tengu_velvety_kay（帮助菜单、提示中显示 effort 入口）。
 */
function shouldShowEffortHint(model) {
  return isEffortAdjustable(model) && isEffortHintFlagOn();
}
//@ chunk-bc4jcw5z.js:21869-21917 placement
/**
 * GrowthBook tengu_velvety_kay（默认关）。
 */
function isEffortHintFlagOn() {
  return getFeatureValue_CACHED_MAY_BE_STALE("tengu_velvety_kay", false);
}
//@ chunk-bc4jcw5z.js:21917-21995 placement
/**
 * 模型本可支持高于上限的级别（/effort 提示受限）。
 */
function hasEffortLevelsAboveCap(model) {
  let effortCap = getEffortCap(model);
  return (
    effortCap !== null &&
    EFFORT_LEVELS.some(
      (level) => effortRank(level) > effortRank(effortCap) && modelSupportsEffortLevel(model, level),
    )
  );
}
//@ chunk-bc4jcw5z.js:21995-22221 placement
/**
 * 请求的 effort 超上限时的提示 "Effort 'x' exceeds the cap … using 'y'."。
 */
function getEffortCapWarning(effortLevel, resolvedInitialModel) {
  if (typeof effortLevel !== "string" || !isEffortLevel(effortLevel)) return null;
  let effortCap = getEffortCap(resolvedInitialModel);
  if (effortCap === null || effortRank(effortLevel) <= effortRank(effortCap)) return null;
  let clamped = resolveEffortValue(resolvedInitialModel, effortLevel) ?? effortCap;
  return `Effort '${effortLevel}' exceeds the cap for ${resolvedInitialModel} set by your settings or organization; using '${clamped}'.`;
}
//@ chunk-bc4jcw5z.js:22221-22266 placement
/**
 * 关键字别名 {ultracode: "xhigh"}。
 */
var EFFORT_LEVEL_ALIASES = {
  med: "medium",
};
var EFFORT_KEYWORD_ALIASES = {
  ultracode: "xhigh",
};
//@ chunk-bc4jcw5z.js:22266-22377 placement
/**
 * 识别 effort 关键字（ultracode）。
 */
function parseEffortKeyword(value) {
  if (typeof value !== "string") return;
  let lower = value.trim().toLowerCase();
  return Object.hasOwn(EFFORT_KEYWORD_ALIASES, lower) ? lower : undefined;
}
//@ chunk-bc4jcw5z.js:22377-22437 placement
/**
 * 关键字 → 对应级别。
 */
function resolveEffortKeyword(value) {
  let effortKeyword = parseEffortKeyword(value);
  return effortKeyword === undefined ? undefined : EFFORT_KEYWORD_ALIASES[effortKeyword];
}
//@ chunk-bc4jcw5z.js:22437-22469 placement
/**
 * String(effort)。
 */
function effortValueToString(value) {
  return String(value);
}
//@ chunk-bc4jcw5z.js:22469-22546 placement
/**
 * 字符串（含 med 别名）→ 合法级别，否则 undefined。
 */
function parseEffortLevel(value) {
  let lower = value.trim().toLowerCase();
  let canonical = EFFORT_LEVEL_ALIASES[lower] ?? lower;
  return isEffortLevel(canonical) ? canonical : undefined;
}
//@ chunk-bc4jcw5z.js:22546-22819 placement
/**
 * 解析 --effort：级别或关键字；未知值给出警告 "Unknown --effort value …"。
 */
function parseEffortFlag(value) {
  let effortLevel = parseEffortLevel(value);
  if (effortLevel !== undefined)
    return {
      level: effortLevel,
      warning: undefined,
    };
  let effortKeyword = parseEffortKeyword(value);
  if (effortKeyword !== undefined)
    return {
      level: effortKeyword,
      warning: undefined,
    };
  return {
    level: undefined,
    warning: `Unknown --effort value '${value}' \u2014 ignoring it and using the default effort. Valid values: ${EFFORT_LEVELS.join(", ")}.`,
  };
}
//@ chunk-bc4jcw5z.js:22819-23028 placement
/**
 * 解析设置/参数里的 effort：整数或级别（含别名、数字字符串），空值为 undefined（旧版同名）。
 */
function parseEffortValue(value) {
  if (value === undefined || value === null || value === "") return;
  if (typeof value === "number" && isIntegerEffort(value)) return value;
  let str = String(value).toLowerCase();
  let canonical = EFFORT_LEVEL_ALIASES[str] ?? str;
  if (isEffortLevel(canonical)) return canonical;
  let numericValue = parseInt(str, 10);
  if (!isNaN(numericValue) && isIntegerEffort(numericValue)) return numericValue;
  return;
}
//@ chunk-bc4jcw5z.js:23028-23112 callgraph-fingerprint (2.1.88 match: toPersistableEffort, 0.601)
/**
 * 可写入设置的 effort（low/medium/high/xhigh；max 只在会话内）。
 */
function toPersistableEffort(value) {
  if (value === "low" || value === "medium" || value === "high" || value === "xhigh") return value;
  return;
}
//@ chunk-bc4jcw5z.js:23112-23177 layout
/**
 * settings.ultracode 为 true 或 effort 参数为 ultracode（ultracode → xhigh 的别名）。
 */
function isUltracodeEnabled(effort) {
  return getInitialSettings().ultracode === true || parseEffortKeyword(effort) === "ultracode";
}
//@ chunk-bc4jcw5z.js:23177-23259 layout
/**
 * CLAUDE_CODE_SUBAGENT_EFFORT 解析后的子代理 effort。
 */
function getSubagentEffortOverride() {
  let CLAUDE_CODE_SUBAGENT_EFFORT = env.CLAUDE_CODE_SUBAGENT_EFFORT;
  return CLAUDE_CODE_SUBAGENT_EFFORT === undefined
    ? undefined
    : parseEffortLevel(CLAUDE_CODE_SUBAGENT_EFFORT);
}
//@ chunk-bc4jcw5z.js:23259-23378 fingerprint (2.1.88 match: getEffortEnvOverride, 1)
/**
 * CLAUDE_CODE_EFFORT_LEVEL：unset/auto 返回 null（强制不设），否则解析出的级别或数字；未设置为 undefined。
 */
function getEffortEnvOverride() {
  let envOverride = env.CLAUDE_CODE_EFFORT_LEVEL;
  return envOverride?.toLowerCase() === "unset" || envOverride?.toLowerCase() === "auto"
    ? null
    : parseEffortValue(envOverride);
}
//@ chunk-bc4jcw5z.js:23378-23453 layout (2.1.88 match: resolveAgentModelDisplay, 0.818)
/**
 * 模型选择常量 {kind:"inherit"} 与 {kind:"default"}。
 */
var INHERIT_EFFORT_SETTING; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var DEFAULT_EFFORT_SETTING;
deferInit("chunk-bc4jcw5z.js:23378", () => {
  INHERIT_EFFORT_SETTING = Object.freeze({
    kind: "inherit",
  });
  DEFAULT_EFFORT_SETTING = Object.freeze({
    kind: "default",
  });
});
//@ chunk-bc4jcw5z.js:23453-23498 layout
/**
 * {kind:"level", value}。
 */
function levelEffortSetting(value) {
  return {
    kind: "level",
    value,
  };
}
//@ chunk-bc4jcw5z.js:23498-23542 layout
/**
 * undefined → default，否则 level。
 */
function toEffortSettingOrDefault(value) {
  return value === undefined ? DEFAULT_EFFORT_SETTING : levelEffortSetting(value);
}
//@ chunk-bc4jcw5z.js:23542-23586 layout
/**
 * undefined → inherit，否则 level。
 */
function toEffortSettingOrInherit(effortOrKeyword) {
  return effortOrKeyword === undefined ? INHERIT_EFFORT_SETTING : levelEffortSetting(effortOrKeyword);
}
//@ chunk-bc4jcw5z.js:23586-23647 layout
/**
 * 级别设置返回其字符串，否则 null。
 */
function effortSettingToString(sessionEffort) {
  return sessionEffort.kind === "level" ? String(sessionEffort.value) : null;
}
//@ chunk-bc4jcw5z.js:23647-23720 layout
/**
 * 非空且不超过 128 字符的字符串，否则 null。
 */
function toBoundedLabel(label) {
  return typeof label === "string" && label !== "" && label.length <= MAX_REQUEST_ID_LENGTH ? label : null;
}
//@ chunk-bc4jcw5z.js:23720-23825 layout
/**
 * 两个会话 effort 设置是否相同。
 */
function isSameEffortSetting(sessionEffort, sessionEffort_2) {
  return (
    sessionEffort === sessionEffort_2 ||
    (sessionEffort.kind === sessionEffort_2.kind &&
      (sessionEffort.kind !== "level" ||
        (sessionEffort_2.kind === "level" && sessionEffort.value === sessionEffort_2.value)))
  );
}
//@ chunk-bc4jcw5z.js:23825-24208 layout
/**
 * isLegacyUserEffortModel 的结果缓存。
 */
var LEGACY_USER_EFFORT_MODELS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var legacyUserEffortCache;
deferInit("chunk-bc4jcw5z.js:23825", () => {
  LEGACY_USER_EFFORT_MODELS = new Set([
    "claude-3-5-haiku",
    "claude-3-5-sonnet",
    "claude-3-7-sonnet",
    "claude-haiku-4-5",
    "claude-sonnet-4-0",
    "claude-sonnet-4-5",
    "claude-sonnet-4-6",
    "claude-sonnet-5",
    "claude-opus-4-0",
    "claude-opus-4-1",
    "claude-opus-4-5",
    "claude-opus-4-6",
    "claude-opus-4-7",
    "claude-opus-4-8",
    "claude-opus-5",
    "claude-fable-5",
    "claude-fable-5-1",
    "claude-mythos-5",
    "claude-mythos-5-1",
  ]);
  legacyUserEffortCache = new Map();
});
//@ chunk-bc4jcw5z.js:24208-24299 layout
/**
 * 模型在旧式名单内或名字无法解析为版本化模型时，顶层用户 effortLevel 对其生效。
 */
function isLegacyUserEffortModel(modelSettingsKey) {
  let legacyValue = legacyUserEffortCache.get(modelSettingsKey);
  if (legacyValue === undefined) {
    legacyValue =
      LEGACY_USER_EFFORT_MODELS.has(modelSettingsKey) || !isStandardVersion(parseModelId(modelSettingsKey));
    legacyUserEffortCache.set(modelSettingsKey, legacyValue);
  }
  return legacyValue;
}
//@ chunk-bc4jcw5z.js:24299-24656 layout
/**
 * 首次启动版本未记录时、尚未解除“发布期默认 effort 固定”的模型（opus-4-7、opus-4-8、fable-5 及 ANTHROPIC_DEFAULT_FABLE_MODEL）。
 */
function getLaunchEffortPinnedModels() {
  let globalConfig = getGlobalConfig();
  if (globalConfig.firstStartVersion !== undefined) return [];
  let list = [];
  if (!globalConfig.unpinOpus47LaunchEffort) list.push("claude-opus-4-7");
  if (!globalConfig.unpinOpus48LaunchEffort) list.push("claude-opus-4-8");
  if (!globalConfig.unpinFable5LaunchEffort) {
    list.push("claude-fable-5");
    let ANTHROPIC_DEFAULT_FABLE_MODEL = env.ANTHROPIC_DEFAULT_FABLE_MODEL;
    if (
      ANTHROPIC_DEFAULT_FABLE_MODEL &&
      !isFableModel(
        getCanonicalName(parseUserSpecifiedModel(ANTHROPIC_DEFAULT_FABLE_MODEL), {
          deterministic: true,
          identity: true,
        }),
      )
    )
      list.push(getModelSettingsKey(ANTHROPIC_DEFAULT_FABLE_MODEL));
  }
  return list;
}
//@ chunk-bc4jcw5z.js:24656-25027 layout
/**
 * 按优先级列出带设置的来源（flagSettings 展开为 project/local；去重同一文件）。
 */
function getEffortSettingsSources() {
  let seenModels = new Set();
  let rows = [];
  for (let source of getEnabledSettingSources()) {
    if (source === "flagSettings") {
      let [approval, current] = approvalLayers();
      if (approval !== undefined)
        rows.push({
          source: "projectSettings",
          settings: approval,
        });
      if (current !== undefined)
        rows.push({
          source: "localSettings",
          settings: current,
        });
    }
    let settingsFilePathForSource = getSettingsFilePathForSource(source);
    if (settingsFilePathForSource !== undefined) {
      let resolvedSourcePath = resolve(settingsFilePathForSource);
      if (seenModels.has(resolvedSourcePath) && source !== "flagSettings") continue;
      seenModels.add(resolvedSourcePath);
    }
    let settingsForSource = getSettingsForSource(source);
    if (settingsForSource !== undefined && settingsForSource !== null)
      rows.push({
        source,
        settings: settingsForSource,
      });
  }
  return rows;
}
//@ chunk-bc4jcw5z.js:25027-26364 layout
/**
 * 构建 effort 设置表：{default（非用户来源的顶层 effortLevel）, legacyUserEffort（用户设置顶层）, byModel（各来源 modelSettings.<模型>.effortLevel，按优先级取第一个）}；组织覆盖与发布期固定模型强制为 undefined。
 */
function buildEffortSettingsTable({ flagLayerAsLaunched = false } = {}) {
  let effortSettingsSources = getEffortSettingsSources();
  let flagSettings = flagLayerAsLaunched ? getFlagSettingsInline() : null;
  if (flagSettings !== null && ("effortLevel" in flagSettings || "modelSettings" in flagSettings)) {
    let flagSettingsPath = getSettingsFilePathForSource("flagSettings");
    let flagSettingsParsed =
      flagSettingsPath === undefined
        ? null
        : parseSettingsFile(
            flagSettingsPath,
            getFlagSettingsExpectedContent() ?? getFlagSettingsFilePinnedContent(),
          ).settings;
    effortSettingsSources = effortSettingsSources.map((sourceEntry) =>
      sourceEntry.source === "flagSettings"
        ? {
            source: sourceEntry.source,
            settings: {
              ...sourceEntry.settings,
              effortLevel: flagSettingsParsed?.effortLevel,
              modelSettings: flagSettingsParsed?.modelSettings,
            },
          }
        : sourceEntry,
    );
  }
  let orgDefaultCache = getOrgModelDefaultCache();
  let values =
    orgDefaultCache !== null && orgOverridesUserEffort(orgDefaultCache.name)
      ? getModelSettingsKey(orgDefaultCache.name)
      : undefined;
  let modelKey;
  let level;
  let rows = [];
  for (let { source, settings: entry } of effortSettingsSources) {
    let hasGlobalLevel = entry.effortLevel !== undefined;
    if (source === "userSettings") {
      modelKey = toPersistableEffort(entry.effortLevel);
      rows.push({
        source,
        setsTopLevel: false,
        settings: entry,
      });
      continue;
    }
    if (hasGlobalLevel)
      level = {
        level: toPersistableEffort(entry.effortLevel),
      };
    rows.push({
      source,
      setsTopLevel: hasGlobalLevel,
      settings: entry,
    });
  }
  rows.reverse();
  let mapped = rows.map(({ settings: row }) => {
    let byModel = new Map();
    for (let [key, value] of Object.entries(row.modelSettings ?? {})) {
      let effortLevel = value?.effortLevel;
      if (effortLevel === undefined) continue;
      let modelSettingsKey = getModelSettingsKey(key);
      if (key === modelSettingsKey || !byModel.has(modelSettingsKey))
        byModel.set(modelSettingsKey, effortLevel);
    }
    return byModel;
  });
  let modelKeys = new Set();
  if (values !== undefined) modelKeys.add(values);
  for (let map of mapped) for (let key of map.keys()) modelKeys.add(key);
  let settings = {};
  for (let modelKey of modelKeys) {
    if (modelKey === values) settings[modelKey] = undefined;
    for (let rowIndex = 0; rowIndex < rows.length; rowIndex++) {
      if (modelKey === values && !isReadOnlySettingSource(rows[rowIndex].source)) continue;
      let modelSettings = mapped[rowIndex].get(modelKey);
      if (modelSettings !== undefined) {
        settings[modelKey] = toPersistableEffort(modelSettings);
        break;
      }
      if (rows[rowIndex].setsTopLevel) {
        settings[modelKey] = toPersistableEffort(rows[rowIndex].settings.effortLevel);
        break;
      }
    }
  }
  if (level !== undefined) modelKey = undefined;
  if (modelKey !== undefined) {
    for (let pinnedModel of getLaunchEffortPinnedModels())
      if (!Object.hasOwn(settings, pinnedModel) && !Object.hasOwn(Object.prototype, pinnedModel))
        settings[pinnedModel] = undefined;
  }
  return {
    default: level?.level,
    legacyUserEffort: modelKey,
    byModel: settings,
  };
}
//@ chunk-bc4jcw5z.js:26364-26427 layout (2.1.88 match: getEnabledSettingSources, 1)
/**
 * policySettings 或 flagSettings。旧版名错配。
 */
function isReadOnlySettingSource(source) {
  return source === "policySettings" || source === "flagSettings";
}
//@ chunk-bc4jcw5z.js:26427-26505 layout
/**
 * 组织强制 effort 时该模型的生效级别。
 */
function getOrgOverriddenEffort(model) {
  if (!orgOverridesUserEffort(model)) return null;
  return normalizeEffortLevel(
    resolveAppliedEffort(
      lookupEffortSetting(buildEffortSettingsTable(), model) ?? getDefaultEffortForModel(model),
      model,
    ),
  );
}
//@ chunk-bc4jcw5z.js:26505-26693 layout
/**
 * 从 effort 设置表取模型的 effort：byModel → default → 旧式用户设置（仅旧模型）。
 */
function lookupEffortSetting(model, fallback) {
  let modelSettingsKey = getModelSettingsKey(fallback);
  if (Object.hasOwn(model.byModel, modelSettingsKey)) return model.byModel[modelSettingsKey];
  if (model.default !== undefined || model.legacyUserEffort === undefined) return model.default;
  return isLegacyUserEffortModel(modelSettingsKey) ? model.legacyUserEffort : undefined;
}
//@ chunk-bc4jcw5z.js:26693-26789 layout
/**
 * 设置表没有旧式用户值也没有按模型条目。
 */
function isEffortSettingsTableEmpty(settingsEffortTable) {
  if (settingsEffortTable.legacyUserEffort !== undefined) return false;
  for (let key in settingsEffortTable.byModel) return false;
  return true;
}
//@ chunk-bc4jcw5z.js:26789-26857 layout
/**
 * 模型在 settings.modelSettings 里的键（去 [1m]、确定性规范名）。
 */
function getModelSettingsKey(model) {
  return strip1mSuffix(
    getCanonicalName(resolveModelAliasSpelling(model), {
      deterministic: true,
      identity: true,
    }),
  );
}
//@ chunk-bc4jcw5z.js:26857-26920 fingerprint (2.1.88 match: getInitialEffortSetting, 1)
/**
 * 生成按模型保存 effort 的设置补丁 {modelSettings:{<模型键>:{effortLevel}}}。
 */
function getInitialEffortSetting(model, effortLevel) {
  return buildModelSettingsPatch(
    model,
    {
      effortLevel,
    },
    {
      effortLevel,
    },
  );
}
//@ chunk-bc4jcw5z.js:26920-27019 layout
/**
 * 模型键是 Object.prototype 上的名字时用回退补丁，防原型污染。
 */
function buildModelSettingsPatch(model, level, extra) {
  let modelSettingsKey = getModelSettingsKey(model);
  return Object.hasOwn(Object.prototype, modelSettingsKey)
    ? extra
    : {
        modelSettings: {
          [modelSettingsKey]: level,
        },
      };
}
//@ chunk-bc4jcw5z.js:27019-27090 placement
/**
 * 按当前账号从全局配置取该模型的 effort 设置。
 */
function userEffortForAccount(accountId) {
  let accountUuid = getOauthAccountInfo()?.accountUuid;
  return accountUuid !== undefined && isAutoCompactOfferAnswered(getGlobalConfig(), accountUuid, accountId);
}
//@ chunk-bc4jcw5z.js:27090-27471 placement (2.1.88 match: _temp8, 0.203)
/**
 * 取当前会话生效的推理强度：会话显式等级直接返回，default 返回 undefined；inherit 时按设置里的按模型强度表查当前主循环模型（withHold 时若模型自带强度则不覆盖）。
 */
function resolveEffortLevel(session, model, { withHold = true } = {}) {
  let sessionEffort = session.sessionEffort ?? INHERIT_EFFORT_SETTING;
  switch (sessionEffort.kind) {
    case "level":
      return sessionEffort.value;
    case "default":
      return;
    case "inherit": {
      if (session.settingsEffortTable === undefined) return;
      if (isEffortSettingsTableEmpty(session.settingsEffortTable) && !hasCarriedRefusalEffort())
        return session.settingsEffortTable.default;
      let resolved =
        model ??
        parseUserSpecifiedModel(
          session.mainLoopModelForSession ?? session.mainLoopModel ?? getDefaultMainLoopModel(),
        );
      return withHold && carriedEffortOnly(resolved) !== undefined
        ? undefined
        : lookupEffortSetting(session.settingsEffortTable, resolved);
    }
  }
}
//@ chunk-bc4jcw5z.js:27471-27510 placement
/**
 * 判断两个模型是否共用同一设置键。
 */
function isSameModelSettings(model, otherModel) {
  return getModelSettingsKey(model) === getModelSettingsKey(otherModel);
}
//@ chunk-bc4jcw5z.js:27510-27612 layout
function dropSessionLevelIfModelDiffers(appState, model, pickedModel) {
  return appState.sessionEffort?.kind !== "level" ||
    model === undefined ||
    pickedModel === undefined ||
    isSameModelSettings(model, pickedModel)
    ? appState
    : withoutSessionLevel(appState);
}
//@ chunk-bc4jcw5z.js:27612-27664 placement
/**
 * 解析 effort 级别（不做保留）。
 */
function resolveEffortWithoutHold(appState, model) {
  return resolveEffortLevel(withoutSessionLevel(appState), model, {
    withHold: false,
  });
}
//@ chunk-bc4jcw5z.js:27664-27746 placement
/**
 * 把会话里的显式级别改为继承，再解析 effort。
 */
function withoutSessionLevel(appState) {
  return appState.sessionEffort?.kind === "level"
    ? {
        ...appState,
        sessionEffort: INHERIT_EFFORT_SETTING,
      }
    : appState;
}
//@ chunk-bc4jcw5z.js:27746-27828 placement
/**
 * 取 effort 级别值。
 */
function effortLevelValue(value) {
  return value.kind === "level" && typeof value.value === "string" ? value.value : undefined;
}
//@ chunk-bc4jcw5z.js:27828-28139 layout
/**
 * 本次请求的 effort（output_config.effort 的来源）：模型不支持 → undefined；钩子值 > CLAUDE_CODE_EFFORT_LEVEL（unset/auto → 不发）> 本轮 effort > 会话设置 > 默认（getDefaultEffortForModel）；最后经 resolveAppliedEffort 夹取。
 */
function resolveEffortValue(
  model,
  appStateEffort,
  { turnEffort, hookEffortValue, carriedEffort = getCarriedRefusalEffort(model) } = {},
) {
  if (!modelSupportsEffort(model)) return;
  let hasSettingsCap = getSettingsMaxEffort(model) !== null;
  if (hookEffortValue !== undefined) {
    let hookValue =
      typeof hookEffortValue === "number" && hasSettingsCap
        ? normalizeEffortLevel(hookEffortValue)
        : hookEffortValue;
    return resolveAppliedEffort(hookValue, model);
  }
  let effortEnvOverride = getEffortEnvOverride();
  if (effortEnvOverride === null && !hasSettingsCap) return;
  let defaultEffortForModel = getDefaultEffortForModel(model, carriedEffort);
  let chosen =
    effortEnvOverride ??
    (effortEnvOverride === null ? defaultEffortForModel : undefined) ??
    turnEffort ??
    appStateEffort ??
    defaultEffortForModel;
  if (typeof chosen === "number" && hasSettingsCap) chosen = normalizeEffortLevel(chosen);
  return resolveAppliedEffort(chosen, model);
}
//@ chunk-bc4jcw5z.js:28139-28271 layout
/**
 * 模型支持 effort 且无环境覆盖时：给定字符串按组织上限截断；未给且组织默认 effort 存在时用模型默认 effort。
 */
function getModelPickerEffortDefault(model, preferred) {
  if (!modelSupportsEffort(model) || getEffortEnvOverride() !== undefined) return;
  if (typeof preferred === "string") return clampEffortToCap(preferred, model);
  if (preferred === undefined && getOrgDefaultEffort(model)) return getDefaultEffortLevel(model);
  return;
}
//@ chunk-bc4jcw5z.js:28271-28411 fingerprint (2.1.88 match: resolveAppliedEffort, 0.777)
/**
 * 把请求的 effort 落到模型能接受的值：先按组织上限截断，max/xhigh 不支持时降为 high。
 */
function resolveAppliedEffort(model, appStateEffortValue) {
  let resolved = model;
  if (typeof resolved === "string" && isEffortLevel(resolved))
    resolved = clampEffortToCap(resolved, appStateEffortValue);
  if (resolved === "max" && !modelSupportsMaxEffort(appStateEffortValue)) resolved = "high";
  if (resolved === "xhigh" && !modelSupportsXhighEffort(appStateEffortValue)) resolved = "high";
  return resolved;
}
//@ chunk-bc4jcw5z.js:28411-28452 layout
/**
 * 模型默认 effort（规范为级别）。
 */
function getDefaultEffortLevel(model) {
  return normalizeEffortLevel(resolveAppliedEffort(getDefaultEffortForModel(model), model));
}
//@ chunk-bc4jcw5z.js:28452-28488 layout
/**
 * 模型支持每轮 effort 控制（per-turn-control beta）且会话未关闭它。
 */
function modelSupportsPerTurnEffortControl(model) {
  return usesPerTurnEffortBeta(model, getCanonicalName(model));
}
//@ chunk-bc4jcw5z.js:28488-28544 layout
function ultrathinkRaisesEffort(model, appState) {
  return (
    isUltrathinkEnabled() &&
    (!getIsNonInteractiveSession() || isVsCodeOrDesktop()) &&
    canRaiseEffortToXhigh(model, appState)
  );
}
//@ chunk-bc4jcw5z.js:28544-28647 layout
function ultrathinkRaisesEffortInSession(model, appState) {
  let entrypoint = getSessionEntrypoint();
  return (
    isUltrathinkEnabled() &&
    (!getIsNonInteractiveSession() ||
      isVsCodeOrDesktop() ||
      (isDesktopTopNonClaudecode() && REMOTE_ENTRYPOINT_NAMES.some((name) => name === entrypoint)) ||
      isTopLevelBridgeSession()) &&
    canRaiseEffortToXhigh(model, appState)
  );
}
//@ chunk-bc4jcw5z.js:28647-28721 layout
/**
 * ultrathink 有效且当前 effort 低于 xhigh。
 */
function shouldUltrathinkRaiseEffort(model, appState, bridgeSession = false) {
  return (
    (bridgeSession
      ? ultrathinkRaisesEffortInSession(model, appState)
      : ultrathinkRaisesEffort(model, appState)) &&
    effortRank(getEffortLevelOrHigh(model, appState)) < effortRank("xhigh")
  );
}
//@ chunk-bc4jcw5z.js:28721-28826 layout
function canRaiseEffortToXhigh(model, appState) {
  return (
    isEffortAdjustable(model) &&
    modelSupportsPerTurnEffortControl(model) &&
    typeof resolveEffortValue(model, appState) === "string" &&
    resolveEffortValue(model, appState, {
      turnEffort: "xhigh",
    }) === "xhigh"
  );
}
//@ chunk-bc4jcw5z.js:28826-29128 layout
/**
 * 会话中途 effort 实际值发生变化（已有输出、模型支持、非受限）时为真，用于提示 effort 变更。
 */
function shouldShowEffortChangeNotice(target, previous, model, ackedAtOutputTokens, promptCacheMayBeWarm) {
  if (!promptCacheMayBeWarm) return false;
  let totalOutputTokens = getTotalOutputTokens();
  if (totalOutputTokens === 0 || totalOutputTokens === ackedAtOutputTokens) return false;
  if (!modelSupportsEffort(model)) return false;
  if (
    typeof resolveEffortValue(model, target) !== "number" &&
    typeof resolveEffortValue(model, previous) !== "number" &&
    modelSupportsPerTurnEffortControl(model)
  )
    return false;
  if (
    resolveEffortValue(model, target, {
      carriedEffort: null,
    }) === resolveEffortValue(model, previous)
  )
    return false;
  if (
    isRemoteControlChannelAvailable() &&
    target !== undefined &&
    toPersistableEffort(typeof target === "string" ? clampEffortToCap(target, model) : target) === undefined
  )
    return false;
  return true;
}
//@ chunk-bc4jcw5z.js:29128-29196 layout (2.1.88 match: _temp5, 1)
/**
 * 写 userSettings 的 effortLevel。
 */
async function saveEffortToUserSettings(effortLevel, model, storageV5) {
  return updateSettingsForSource(
    "userSettings",
    getInitialEffortSetting(model, effortLevel),
    undefined,
    storageV5,
  );
}
//@ chunk-bc4jcw5z.js:29196-29352 layout
/**
 * 需要持久化且级别可保存时写用户设置，返回错误（如有）。
 */
async function persistEffortSetting(level, model, persistToSettings = true, storageV5) {
  let persistable = level !== undefined ? toPersistableEffort(level) : undefined;
  if (persistToSettings && (level === undefined || persistable !== undefined) && !getRemoteCaps()) {
    let saveResult = await saveEffortToUserSettings(persistable, model, storageV5);
    if (saveResult.error) return saveResult.error;
  }
  return;
}
//@ chunk-bc4jcw5z.js:29352-29443 layout
/**
 * 初始会话 effort 状态 {sessionEffort, settingsEffortTable}。
 */
function createSessionEffortState(effort) {
  let state = {
    sessionEffort: toEffortSettingOrInherit(parseEffortOrKeyword(effort)),
    settingsEffortTable: buildEffortSettingsTable(),
  };
  setMainLoopEffortState(state);
  return state;
}
//@ chunk-bc4jcw5z.js:29443-29523 layout
/**
 * resolveEffortValue 的级别形式。
 */
function getAppliedEffortLevel(model, appState, turnEffort) {
  let effortValue = resolveEffortValue(model, appState, {
    turnEffort,
  });
  return effortValue === undefined ? undefined : normalizeEffortLevel(effortValue);
}
//@ chunk-bc4jcw5z.js:29523-29568 layout (2.1.88 match: getDefaultEffortLevelForOption, 1)
/**
 * 生效的 effort 级别，未设置时视为 high。
 */
function getEffortLevelOrHigh(model, appState, turnEffort) {
  return getAppliedEffortLevel(model, appState, turnEffort) ?? "high";
}
//@ chunk-bc4jcw5z.js:29568-29617 layout
/**
 * 模型支持 effort 时返回生效级别（默认 high），否则 undefined。
 */
function getEffortLevelIfSupported(mainLoopModel, appState, effortLayerOverride) {
  return modelSupportsEffort(mainLoopModel)
    ? getEffortLevelOrHigh(mainLoopModel, appState, effortLayerOverride)
    : undefined;
}
//@ chunk-bc4jcw5z.js:29617-29763 fingerprint (2.1.88 match: getEffortSuffix, 0.861)
/**
 * 显示用后缀 " with <level> effort"。
 */
function getEffortSuffix(model, effortValue, turnEffort, resolvedEffort) {
  if (effortValue === undefined && turnEffort === undefined) return "";
  let resolved =
    resolvedEffort ??
    resolveEffortValue(model, effortValue, {
      turnEffort,
    });
  if (resolved === undefined) return "";
  return ` with ${effortValueToString(normalizeEffortLevel(resolved))} effort`;
}
//@ chunk-bc4jcw5z.js:29763-29805 layout
/**
 * 数值 effort（旧版 isValidNumericEffort）。
 */
function isIntegerEffort(value) {
  return Number.isInteger(value);
}
//@ chunk-bc4jcw5z.js:29805-29878 layout (2.1.88 match: getDefaultEffortLevelForOption, 1)
/**
 * 数值或非法值统一当作 high，合法级别原样返回。
 */
function normalizeEffortLevel(value) {
  if (typeof value === "string") return isEffortLevel(value) ? value : "high";
  return "high";
}
//@ chunk-bc4jcw5z.js:29878-30307 fingerprint (2.1.88 match: getEffortLevelDescription, 0.802)
/**
 * effort 级别的说明文字（/effort 与选择器用）。
 */
function getEffortLevelDescription_2(level) {
  switch (level) {
    case "low":
      return "Quick, straightforward implementation with minimal overhead";
    case "medium":
      return "Balanced approach with standard implementation and testing";
    case "high":
      return "Comprehensive implementation with extensive testing and documentation";
    case "xhigh":
      return "Deeper reasoning than high, just below maximum (on supported models)";
    case "max":
      return `Maximum capability with deepest reasoning. ${MAX_EFFORT_DESCRIPTION}`;
  }
}
//@ chunk-bc4jcw5z.js:30307-30548 callgraph-witnessed (2.1.88 match: getEffortValueDescription, 0.328)
/**
 * effort 值说明；high 在 Pro 订阅且 tengu_slate_finch 时提示“消耗最快”。
 */
function getEffortValueDescription(value) {
  if (typeof value === "string") {
    let effortLevelDescription = getEffortLevelDescription_2(value);
    if (
      value === "high" &&
      isProSubscriber() &&
      getFeatureValue_CACHED_MAY_BE_STALE("tengu_slate_finch", false)
    )
      return `${effortLevelDescription} \xB7 burns fastest \u2014 medium handles most tasks`;
    return effortLevelDescription;
  }
  return "Balanced approach with standard implementation and testing";
}
//@ chunk-bc4jcw5z.js:30548-30637 layout
/**
 * 模型默认 effort：GrowthBook tengu_witty_wand 按模型配置 > 组织默认 > fallback 携带的 effort > 服务端目录 > 配置 default_effort > catalog default_effort（缺省 high）。
 */
function getDefaultEffortForModel(model, carriedEffort) {
  let remoteDefault = remoteDefaultEffort(model);
  return (
    (remoteDefault === undefined ? carriedEffort : undefined) ??
    getOrgDefaultEffort(model) ??
    remoteDefault ??
    modelEffortOverride(model) ??
    getConfiguredDefaultEffort(model) ??
    getDisplayedEffortLevel(model)
  );
}
//@ chunk-bc4jcw5z.js:30637-30731 layout
/**
 * 配置里该模型的 default_effort（模型需支持该级别）。
 */
function getConfiguredDefaultEffort(model) {
  let defaultEffort = getCachedClientData(model)?.default_effort;
  return typeof defaultEffort === "string" &&
    isEffortLevel(defaultEffort) &&
    modelSupportsEffortLevel(model, defaultEffort)
    ? defaultEffort
    : undefined;
}
//@ chunk-bc4jcw5z.js:30731-30800 placement
/**
 * 只有沿用的 effort 时返回它。
 */
function carriedEffortOnly(model) {
  let carriedRefusalEffort = getCarriedRefusalEffort(model);
  return carriedRefusalEffort !== undefined && remoteDefaultEffort(model) === undefined
    ? carriedRefusalEffort
    : undefined;
}
//@ chunk-bc4jcw5z.js:30800-30867 placement
/**
 * 判断是否存在组织默认、远端默认或携带的 effort。
 */
function hasAnyDefaultEffort(model) {
  return (
    getOrgDefaultEffort(model) !== null ||
    remoteDefaultEffort(model) !== undefined ||
    getCarriedRefusalEffort(model) !== undefined
  );
}
//@ chunk-bc4jcw5z.js:30867-30916 placement
/**
 * effort 覆盖值的 schema。
 */
var TENGU_WITTY_WAND; // deferred: uses DoctorLazy (../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
var effortOverrideSchema;
deferInit("chunk-bc4jcw5z.js:30867", () => {
  TENGU_WITTY_WAND = "tengu_witty_wand";
  effortOverrideSchema = DoctorLazy(() => record(stringSchema(), unknown()));
});
//@ chunk-bc4jcw5z.js:30916-31134 placement
function remoteDefaultEffort(model) {
  let featureValue_CACHED_MAY_BE_STALE = getFeatureValue_CACHED_MAY_BE_STALE(TENGU_WITTY_WAND, {});
  if (typeof featureValue_CACHED_MAY_BE_STALE === "string")
    featureValue_CACHED_MAY_BE_STALE = safeParseJSON(featureValue_CACHED_MAY_BE_STALE, false);
  let parseResult = effortOverrideSchema().safeParse(featureValue_CACHED_MAY_BE_STALE);
  if (!parseResult.success) return;
  let value = parseResult.data[strip1mSuffix(getCanonicalName(model))];
  let normalized = typeof value === "string" ? value.trim().toLowerCase() : undefined;
  return normalized !== undefined && isEffortLevel(normalized) ? normalized : undefined;
}
//@ chunk-bc4jcw5z.js:31134-31202 placement
/**
 * 取模型的 effort 覆盖值（只接受合法级别）。
 */
function modelEffortOverride(model) {
  let served = servedDefaultEffort(model, getCanonicalName(model));
  return served !== undefined && isEffortLevel(served) ? served : undefined;
}
//@ chunk-bc4jcw5z.js:31202-31258 placement
function getDisplayedEffortLevel(model) {
  return getCatalogEntry(getCanonicalName(model))?.default_effort ?? "high";
}
//@ chunk-bc4jcw5z.js:31258-31357 placement
/**
 * 判断环境与携带值都没有设置 effort。
 */
function isEffortUnset(queuedMessageText, mainLoopModel) {
  let envOverride = getRemoteCaps() ? undefined : getEffortEnvOverride();
  return (
    (envOverride === null || (envOverride === undefined && queuedMessageText === undefined)) &&
    carriedEffortOnly(mainLoopModel) === undefined
  );
}
//@ chunk-bc4jcw5z.js:31357-31382 placement
/**
 * 恒返回 undefined 的 effort 提示（占位）。
 */
function noEffortHint(model, appState) {
  return;
}
//@ chunk-5dqwe9kx.js:1382-1457 placement (2.1.88 match: getEffortEnvOverride, 0.816)
function getEffortEnvOverride_2(value) {
  let keyword = value.toLowerCase();
  return keyword === "auto" || keyword === "unset" || isReservedEffortKeyword(keyword);
}
//@ chunk-5dqwe9kx.js:1457-1538 placement
function parseEffortArg(value) {
  if (getEffortEnvOverride_2(value))
    return {
      value: undefined,
    };
  let effortLevel = parseEffortLevel(value);
  return effortLevel
    ? {
        value: effortLevel,
      }
    : null;
}
//@ chunk-czq1j3j2.js:696329-696618 callgraph-fingerprint (2.1.88 match: convertEffortValueToLevel, 0.529)
/**
 * 模型选择器某选项的 effort 能力：是否支持 effort/max/xhigh、可选级别（受组织上限）与默认 effort。旧版名 convertEffortValueToLevel 为错配。
 */
function getEffortCapabilitiesForOption(value) {
  let modelOptionValue = resolveModelOptionValue(value);
  let defaultEffort = defaultEffortForModel(value);
  if (!modelOptionValue)
    return {
      supportsEffort: false,
      supportsMax: false,
      supportsXHigh: false,
      capLevels: ["low", "medium", "high"],
      defaultEffort,
    };
  return {
    supportsEffort: modelSupportsEffort(modelOptionValue),
    supportsMax: modelSupportsMaxEffort(modelOptionValue) && isEffortWithinCap("max", modelOptionValue),
    supportsXHigh: modelSupportsXhighEffort(modelOptionValue) && isEffortWithinCap("xhigh", modelOptionValue),
    capLevels: getAllowedEffortLevels(modelOptionValue),
    defaultEffort: clampEffortToCap(defaultEffort, modelOptionValue),
  };
}
//@ chunk-czq1j3j2.js:1135547-1135707 placement
/**
 * 某推理强度相对默认强度的成本比。
 */
function effortCostRatio(model, effortLevel) {
  if (!modelSupportsEffort(model)) return null;
  let effortCostIndex = getCatalogEntry(getCanonicalName(model))?.effort_cost_index;
  if (!effortCostIndex) return null;
  let levelCostRatio = effortCostIndex[effortLevel];
  let defaultCostRatio = effortCostIndex[getDefaultEffortLevel(model)];
  if (levelCostRatio === undefined || !defaultCostRatio) return null;
  return levelCostRatio / defaultCostRatio;
}
//@ chunk-n2cdp9nk.js:30493-30569 placement (2.1.88 match: getRequestTooLargeErrorMessage, 1)
/**
 * effort 级别说明：模型有特定说明时用之，max 级用"May use excessive tokens..."提示。旧版名 getRequestTooLargeErrorMessage 为错配；应归 utils/effort.ts。
 */
function getEffortLevelDescription(mainLoopModel, effortOption) {
  if (hasEffortOverride(mainLoopModel)) return describeEffortLevel(mainLoopModel, effortOption.value);
  return effortOption.value === "max" ? MAX_EFFORT_DESCRIPTION : "";
}
export {
  getEffortLevelIfSupported,
  resolveEffortLevel,
  ultrathinkRaisesEffort,
  ultrathinkRaisesEffortInSession,
  isEffortHigherThan,
  EFFORT_LEVELS,
  getModelSettingsKey,
  modelSupportsXhighEffort,
  resolveEffortValue,
  modelSupportsEffort,
  normalizeEffortLevel,
  getDefaultEffortLevel,
  resolveAppliedEffort,
  isAboveHighEffort,
  isEffortLevel,
  isUltracodeActive,
  toBoundedLabel,
  getEffortEnvOverride,
  isUltracodeAvailable,
  parseEffortLevel,
  persistEffortSetting,
  modelSupportsMaxEffort,
  modelSupportsPerTurnEffortControl,
  isRequestedEffortTheHeldLevel,
  parseEffortValue,
  resolveEffortKeyword,
  toEffortSettingOrDefault,
  parseEffortKeyword,
  isEffortChangedFromSession,
  isSameEffortSetting,
  buildEffortSettingsTable,
  createSessionEffortState,
  isUltracodeEnabled,
  parseEffortFlag,
  getAllowedEffortLevels,
  clampEffortToCap,
  toPersistableEffort,
  effortValueToString,
  getEffortValueDescription,
  getOrgOverriddenEffort,
  carriedEffortOnly,
  getAppliedEffortLevel,
  getOrgDefaultEffort,
  noEffortHint,
  getEffortEnvOverride_2,
  releaseCarriedEffortForEffortChange,
  isEffortCarryDisabled,
  carriedEffortForModel,
  releaseCarriedEffortIfModelChanged,
  effortSettingToString,
  effortLevelValue,
  userEffortForAccount,
  buildModelSettingsPatch,
  shouldUltrathinkRaiseEffort,
  dropSessionLevelIfModelDiffers,
  modelSupportsEffortLevel,
  effortRank,
  isEffortWithinCap,
  getEffortLevelOrHigh,
  modelCapsEffortWhenThinkingDisabled,
  getSubagentEffortOverride,
  getEffortSettingsSources,
  shouldShowEffortHint,
  getModelPickerEffortDefault,
  isSameModelSettings,
  withoutSessionLevel,
  levelEffortSetting,
  resolveEffortWithoutHold,
  lookupEffortSetting,
  getEffortCapabilitiesForOption,
  getEffortCapWarning,
  orgOverridesUserEffort,
  isLegacyUserEffortModel,
  shouldShowEffortChangeNotice,
  effortCostRatio,
  getDefaultEffortForModel,
  hasAnyDefaultEffort,
  getEffortSuffix,
  isEffortHintFlagOn,
  parseEffortArg,
  getEffortCap,
  hasEffortLevelsAboveCap,
  isSpecialEffortKeywordDisabled,
  isEffortUnset,
  getEffortLevelDescription,
  INHERIT_EFFORT_SETTING,
};
