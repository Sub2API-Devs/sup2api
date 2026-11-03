/**
 * utils/effort.ts
 *
 * effort（推理强度）：级别 low/medium/high/xhigh/max、模型是否支持 effort/xhigh/max、默认 effort 的来源顺序、环境变量与 /effort 覆盖、组织上限截断、按模型保存的 effort 设置。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/effort.ts
 * pieces: chunk-18hwfzwa.js (2), chunk-3rwvzn82.js (1), chunk-dcmhvw5a.js (2), chunk-kcvmr83c.js (2), chunk-kswt4qha.js (94)
 * attribution: callgraph-fingerprint 4, placement 19, callgraph-witnessed 2, layout 68, file-local 3, fingerprint 5
 */
import { resolve } from "path";
import {
  isEffortMarkedUnsupported,
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
  getAllPolicyTierSettings,
  getSettingsForSource,
  getInitialSettings_2,
  getSettingsFilePathForSource,
  updateSettingsForSource,
} from "./settings/settings.js";
import { getEnabledSettingSources } from "./settings/constants.js";
import {
  approvalLayers,
  isAutoCompactOfferAnswered,
  hasCarriedRefusalEffort,
  getCarriedRefusalEffort,
  isVirtualPancakeEnabled,
  parseEffortOrKeyword,
  isReservedEffortKeyword,
} from "./permissions/permissionSetup.js";
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
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../services/analytics/growthbook.js";
import { MAX_REQUEST_ID_LENGTH } from "./controlMessageCompat.js";
import { isStandardVersion, parseModelId, strip1mSuffix } from "./model/modelIds.js";
import { getGlobalConfig, getCachedClientData } from "./config.js";
import { isFableModel } from "./model/fableMitigations.js";
import { parseUserSpecifiedModel } from "./model/modelDisplay.js";
import { getDefaultMainLoopModel } from "./model/modelFallback.js";
import { usesPerTurnEffortBeta } from "./betas.js";
import { isUltrathinkEnabled } from "./thinking.js";
import { isVsCodeOrDesktop } from "./sessionShape.js";
import { MAX_EFFORT_DESCRIPTION } from "./settings/permissionRuleCarveOut.js";
import { DoctorLazy } from "../cli/handlers/util.js";
import { record, string, unknown } from "../../vendor/zod/v4/classic/schemas.js";
import { safeParseJSON } from "./json.js";
import { resolveModelOptionValue, defaultEffortForModel } from "../components/ModelPicker.js";
import { hasEffortOverride, describeEffortLevel } from "../components/EffortSlider.js";

//@ chunk-kswt4qha.js:17736-18187 callgraph-fingerprint = modelSupportsEffort (0.2)
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
  let f = modelEffortLevels(model, canonicalName);
  if (f !== undefined) return f.length > 0;
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
//@ chunk-kswt4qha.js:18187-18635 callgraph-fingerprint = modelSupportsMaxEffort (0.162)
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
  let f = modelEffortLevels(model, canonicalName);
  if (f !== undefined) return f.includes("max");
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
//@ chunk-kswt4qha.js:18635-19139 layout
/**
 * 模型是否支持 xhigh effort：被 API 拒过 effort → 否；能力覆盖；catalog 能力 xhigh_effort；服务端 effort_levels；早于 opus-4-7 的老模型否；mythos-5 是；其余第一方系提供商是。
 */
function modelSupportsXhighEffort(e) {
  if (isEffortMarkedUnsupported(e)) return false;
  let capabilityOverride = getCapabilityOverrideCached(e, "xhigh_effort");
  if (capabilityOverride !== undefined) return capabilityOverride;
  let canonicalName = getCanonicalName(e);
  let catalogEffortCapability = getCatalogEffortCapability("xhigh_effort", e, canonicalName);
  if (catalogEffortCapability !== undefined) return catalogEffortCapability;
  let f = modelEffortLevels(e, canonicalName);
  if (f !== undefined) return f.includes("xhigh");
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
  if (modelSupportsCapability(canonicalName, "xhigh_effort", e) || canonicalName === "claude-mythos-5")
    return true;
  return hasFirstPartyCapabilities(getProviderForModel(e));
}
//@ chunk-kswt4qha.js:19139-19243 layout
/**
 * catalog 能力查询，且 effort 能力没被关闭（effort=false 时直接 false）。
 */
function getCatalogEffortCapability(e, n, canonicalName) {
  if (modelCapabilitiesEnvEntry("effort", canonicalName) === false) return false;
  let s = modelCapabilitiesEnvEntry(e, canonicalName);
  if (s === undefined) return;
  return s && modelSupportsEffort(n);
}
//@ chunk-kswt4qha.js:19243-19272 layout
/**
 * 同 modelSupportsXhighEffort（ultracode 映射到 xhigh）。
 */
function modelSupportsUltracode(e) {
  return modelSupportsXhighEffort(e);
}
//@ chunk-kswt4qha.js:19272-19320 layout
/**
 * 工作流（Workflow）可用且模型支持 xhigh（模型未给时只看工作流）。
 */
function isUltracodeAvailable(e) {
  return isWorkflowsAvailable() && (e === undefined || modelSupportsUltracode(e));
}
//@ chunk-kswt4qha.js:19320-19358 layout
/**
 * ultracode 设置为 true 且可用。
 */
function isUltracodeActive(ultracode, n) {
  return ultracode === true && isUltracodeAvailable(n);
}
//@ chunk-kswt4qha.js:19358-19528 layout
/**
 * 新 effort 与会话 effort（或当前生效值）是否不同（考虑上限夹取）。
 */
function isEffortChangedFromSession(model, n, r) {
  if (n.sessionEffort?.kind === "level") {
    let s = n.sessionEffort.value;
    return !(r === s || (typeof r === "string" && isEffortLevel(r) && clampEffortToCap(r, model) === s));
  }
  return getEffortLevelOrHigh(model, resolveEffortLevel(n)) !== getEffortLevelOrHigh(model, r);
}
//@ chunk-kswt4qha.js:19528-19708 layout
/**
 * 请求的级别等于“带 hold 的生效 effort”且与不带 hold 时不同（即该级别只是被保持而来）。
 */
function isRequestedEffortTheHeldLevel(model, effortLevel, r) {
  if (r.sessionEffort?.kind === "level" || typeof effortLevel !== "string") return false;
  let effortValue = resolveEffortValue(model, resolveEffortLevel(r, model));
  let effortValue_2 = resolveEffortValue(
    model,
    resolveEffortLevel(r, model, {
      withHold: false,
    }),
    {
      carriedEffort: null,
    },
  );
  return parseEffortLevel(effortLevel) === effortValue && effortValue !== effortValue_2;
}
//@ chunk-kswt4qha.js:19708-19745 file-local
/**
 * 是否是 low/medium/high/xhigh/max 之一（旧版同名）。
 */
function isEffortLevel(value) {
  return EFFORT_LEVELS.includes(value);
}
//@ chunk-kswt4qha.js:19745-19780 layout
/**
 * effort 级别在 EFFORT_LEVELS 中的序号。
 */
function effortRank(e) {
  return EFFORT_LEVELS.indexOf(e);
}
//@ chunk-kswt4qha.js:19780-19795 layout
/**
 * "high"：thinking 关闭时部分模型的 effort 上限（claude.ts 里 clamp 用）。
 */
var THINKING_DISABLED_EFFORT_CAP = "high";
//@ chunk-kswt4qha.js:19795-19837 layout
/**
 * 级别高于 high（xhigh/max）。
 */
function isAboveHighEffort(e) {
  return isEffortLevel(e) && effortRank(e) > effortRank(THINKING_DISABLED_EFFORT_CAP);
}
//@ chunk-kswt4qha.js:19837-19932 layout
/**
 * thinking 关闭时是否限制 effort（catalog 能力 thinking_disabled_effort_cap，默认 opus-5）。
 */
function modelCapsEffortWhenThinkingDisabled(e) {
  let canonicalName = getCanonicalName(e);
  return (
    modelSupportsCapability(canonicalName, "thinking_disabled_effort_cap", e) ??
    canonicalName === "claude-opus-5"
  );
}
//@ chunk-kswt4qha.js:19932-20366 layout
/**
 * 各设置来源（含 modelSettings.<模型>.maxEffortLevel）中最严格的 maxEffortLevel；max 视为不设上限。
 */
function getSettingsMaxEffort(e) {
  let n = [
    ...getAllPolicyTierSettings(),
    ...getEnabledSettingSources().map((f) => getSettingsForSource(f)),
    ...approvalLayers(),
  ];
  let r = n.some((f) => Object.values(f?.modelSettings ?? {}).some((d) => d?.maxEffortLevel !== undefined))
    ? getModelSettingsKey(e)
    : undefined;
  let s = null;
  for (let f of n) {
    if (!f) continue;
    let d;
    if (r !== undefined)
      for (let [key, value] of Object.entries(f.modelSettings ?? {})) {
        let maxEffortLevel = value?.maxEffortLevel;
        if (
          maxEffortLevel !== undefined &&
          (d === undefined || effortRank(maxEffortLevel) < effortRank(d)) &&
          getModelSettingsKey(key) === r
        )
          d = maxEffortLevel;
      }
    d ??= f.maxEffortLevel;
    if (d !== undefined && d !== "max" && (s === null || effortRank(d) < effortRank(s))) s = d;
  }
  return s;
}
//@ chunk-kswt4qha.js:20366-20677 layout
/**
 * 本模型的 effort 上限：设置上限与组织模型访问表（firstParty/gateway 的 maxEffortLevel）取更严格者；max 返回 null。
 */
function getEffortCap(e) {
  let settingsMaxEffort = getSettingsMaxEffort(e);
  let r = null;
  let apiProvider = getAPIProvider();
  if (apiProvider === "firstParty" || apiProvider === "gateway") {
    let canonicalName = getCanonicalName(strip1mTag(e.trim().toLowerCase()), {
      identity: true,
    });
    let maxEffortLevel = getModelAccessCache().find(
      (E) =>
        getCanonicalName(strip1mTag(E.apiName.trim().toLowerCase()), {
          identity: true,
        }) === canonicalName,
    )?.maxEffortLevel;
    r = maxEffortLevel != null && isEffortLevel(maxEffortLevel) ? maxEffortLevel : null;
  }
  let f =
    r === null
      ? settingsMaxEffort
      : settingsMaxEffort === null
        ? r
        : effortRank(settingsMaxEffort) < effortRank(r)
          ? settingsMaxEffort
          : r;
  return f === "max" ? null : f;
}
//@ chunk-kswt4qha.js:20677-20943 layout
/**
 * 组织默认模型缓存与该模型一致时返回其 default_effort_level（仅第一方）。
 */
function getOrgDefaultEffort(e) {
  if (getAPIProvider() !== "firstParty") return null;
  let orgModelDefaultCache = getOrgModelDefaultCache();
  if (orgModelDefaultCache === null) return null;
  let defaultEffortLevel = orgModelDefaultCache.default_effort_level;
  if (defaultEffortLevel == null || !isEffortLevel(defaultEffortLevel)) return null;
  let canonicalName = getCanonicalName(strip1mTag(e.trim().toLowerCase()), {
    identity: true,
  });
  return getCanonicalName(strip1mTag(orgModelDefaultCache.name.trim().toLowerCase()), {
    identity: true,
  }) === canonicalName
    ? defaultEffortLevel
    : null;
}
//@ chunk-kswt4qha.js:20943-21014 layout
/**
 * 组织设置 override_user_effort 且该模型有组织默认 effort。
 */
function orgOverridesUserEffort(e) {
  return getOrgModelDefaultCache()?.override_user_effort === true && getOrgDefaultEffort(e) !== null;
}
//@ chunk-kswt4qha.js:21014-21073 layout
/**
 * 级别不超过上限（无上限为真）。
 */
function isEffortWithinCap(e, modelOptionValue) {
  let effortCap = getEffortCap(modelOptionValue);
  return effortCap === null || effortRank(e) <= effortRank(effortCap);
}
//@ chunk-kswt4qha.js:21073-21146 layout
/**
 * 上限以内的 effort 级别列表。
 */
function getAllowedEffortLevels(e) {
  let effortCap = getEffortCap(e);
  return EFFORT_LEVELS.filter((r) => effortCap === null || effortRank(r) <= effortRank(effortCap));
}
//@ chunk-kswt4qha.js:21146-21208 layout
/**
 * 超过上限时降到上限。
 */
function clampEffortToCap(e, n) {
  let effortCap = getEffortCap(n);
  return effortCap !== null && effortRank(e) > effortRank(effortCap) ? effortCap : e;
}
//@ chunk-kswt4qha.js:21208-21289 layout
/**
 * xhigh/max 需要模型支持，其他级别都可。
 */
function modelSupportsEffortLevel(e, n) {
  if (n === "xhigh") return modelSupportsXhighEffort(e);
  if (n === "max") return modelSupportsMaxEffort(e);
  return true;
}
//@ chunk-kswt4qha.js:21289-21416 layout = getRequestTooLargeErrorMessage (0.801)
/**
 * 在模型可用 effort 级别中找比当前高(1)/低一级的级别。应归 utils/effort.ts。
 */
function findAdjacentEffortLevel(e, n, r) {
  let filtered = getAllowedEffortLevels(e).filter((f) => f !== "max" && modelSupportsEffortLevel(e, f));
  return r === 1
    ? filtered.find((f) => effortRank(f) > effortRank(n))
    : filtered.findLast((f) => effortRank(f) < effortRank(n));
}
//@ chunk-kswt4qha.js:21416-21494 layout = getRequestTooLargeErrorMessage (1)
/**
 * 当前之上只剩 max 且模型支持 max。应归 utils/effort.ts。
 */
function isOnlyMaxAboveEffort(mainLoopModel, effortLevelOrHigh) {
  return (
    effortLevelOrHigh !== "max" &&
    findAdjacentEffortLevel(mainLoopModel, effortLevelOrHigh, 1) === undefined &&
    isEffortWithinCap("max", mainLoopModel) &&
    modelSupportsMaxEffort(mainLoopModel)
  );
}
//@ chunk-kswt4qha.js:21494-21544 layout
/**
 * 模型支持 effort、非受限会话且未被 CLAUDE_CODE_EFFORT_LEVEL 覆盖。
 */
function isEffortAdjustable(e) {
  return modelSupportsEffort(e) && !isRemoteSessionAvailable() && getEffortEnvOverride() === undefined;
}
//@ chunk-kswt4qha.js:21544-21580 layout
/**
 * isEffortAdjustable 且 GrowthBook tengu_velvety_kay（帮助菜单、提示中显示 effort 入口）。
 */
function shouldShowEffortHint(mainLoopModel) {
  return isEffortAdjustable(mainLoopModel) && isEffortHintFlagOn();
}
//@ chunk-kswt4qha.js:21580-21628 layout
/**
 * GrowthBook tengu_velvety_kay（默认关）。
 */
function isEffortHintFlagOn() {
  return getFeatureValue_CACHED_MAY_BE_STALE("tengu_velvety_kay", false);
}
//@ chunk-kswt4qha.js:21628-21706 layout
/**
 * 模型本可支持高于上限的级别（/effort 提示受限）。
 */
function hasEffortLevelsAboveCap(e) {
  let effortCap = getEffortCap(e);
  return (
    effortCap !== null &&
    EFFORT_LEVELS.some((r) => effortRank(r) > effortRank(effortCap) && modelSupportsEffortLevel(e, r))
  );
}
//@ chunk-kswt4qha.js:21706-21932 layout
/**
 * 请求的 effort 超上限时的提示 "Effort 'x' exceeds the cap … using 'y'."。
 */
function getEffortCapWarning(effortLevel, resolvedInitialModel) {
  if (typeof effortLevel !== "string" || !isEffortLevel(effortLevel)) return null;
  let effortCap = getEffortCap(resolvedInitialModel);
  if (effortCap === null || effortRank(effortLevel) <= effortRank(effortCap)) return null;
  let s = resolveEffortValue(resolvedInitialModel, effortLevel) ?? effortCap;
  return `Effort '${effortLevel}' exceeds the cap for ${resolvedInitialModel} set by your settings or organization; using '${s}'.`;
}
//@ chunk-kswt4qha.js:21932-21977 file-local
/**
 * 关键字别名 {ultracode: "xhigh"}。
 */
var EFFORT_LEVEL_ALIASES = {
  med: "medium",
};
var EFFORT_KEYWORD_ALIASES = {
  ultracode: "xhigh",
};
//@ chunk-kswt4qha.js:21977-22088 layout
/**
 * 识别 effort 关键字（ultracode）。
 */
function parseEffortKeyword(e) {
  if (typeof e !== "string") return;
  let lower = e.trim().toLowerCase();
  return Object.hasOwn(EFFORT_KEYWORD_ALIASES, lower) ? lower : undefined;
}
//@ chunk-kswt4qha.js:22088-22148 layout
/**
 * 关键字 → 对应级别。
 */
function resolveEffortKeyword(e) {
  let effortKeyword = parseEffortKeyword(e);
  return effortKeyword === undefined ? undefined : EFFORT_KEYWORD_ALIASES[effortKeyword];
}
//@ chunk-kswt4qha.js:22148-22180 layout
/**
 * String(effort)。
 */
function effortValueToString(e) {
  return String(e);
}
//@ chunk-kswt4qha.js:22180-22257 layout
/**
 * 字符串（含 med 别名）→ 合法级别，否则 undefined。
 */
function parseEffortLevel(e) {
  let lower = e.trim().toLowerCase();
  let r = EFFORT_LEVEL_ALIASES[lower] ?? lower;
  return isEffortLevel(r) ? r : undefined;
}
//@ chunk-kswt4qha.js:22257-22530 layout
/**
 * 解析 --effort：级别或关键字；未知值给出警告 "Unknown --effort value …"。
 */
function parseEffortFlag(e) {
  let effortLevel = parseEffortLevel(e);
  if (effortLevel !== undefined)
    return {
      level: effortLevel,
      warning: undefined,
    };
  let effortKeyword = parseEffortKeyword(e);
  if (effortKeyword !== undefined)
    return {
      level: effortKeyword,
      warning: undefined,
    };
  return {
    level: undefined,
    warning: `Unknown --effort value '${e}' \u2014 ignoring it and using the default effort. Valid values: ${EFFORT_LEVELS.join(", ")}.`,
  };
}
//@ chunk-kswt4qha.js:22530-22739 file-local
/**
 * 解析设置/参数里的 effort：整数或级别（含别名、数字字符串），空值为 undefined（旧版同名）。
 */
function parseEffortValue(value) {
  if (value === undefined || value === null || value === "") return;
  if (typeof value === "number" && isIntegerEffort(value)) return value;
  let str = String(value).toLowerCase();
  let r = EFFORT_LEVEL_ALIASES[str] ?? str;
  if (isEffortLevel(r)) return r;
  let numericValue = parseInt(str, 10);
  if (!isNaN(numericValue) && isIntegerEffort(numericValue)) return numericValue;
  return;
}
//@ chunk-kswt4qha.js:22739-22823 callgraph-fingerprint = toPersistableEffort (0.601)
/**
 * 可写入设置的 effort（low/medium/high/xhigh；max 只在会话内）。
 */
function toPersistableEffort(value) {
  if (value === "low" || value === "medium" || value === "high" || value === "xhigh") return value;
  return;
}
//@ chunk-kswt4qha.js:22823-22888 layout
/**
 * settings.ultracode 为 true 或 effort 参数为 ultracode（ultracode → xhigh 的别名）。
 */
function isUltracodeEnabled(effort) {
  return getInitialSettings_2().ultracode === true || parseEffortKeyword(effort) === "ultracode";
}
//@ chunk-kswt4qha.js:22888-22970 layout
/**
 * CLAUDE_CODE_SUBAGENT_EFFORT 解析后的子代理 effort。
 */
function getSubagentEffortOverride() {
  let CLAUDE_CODE_SUBAGENT_EFFORT = env.CLAUDE_CODE_SUBAGENT_EFFORT;
  return CLAUDE_CODE_SUBAGENT_EFFORT === undefined
    ? undefined
    : parseEffortLevel(CLAUDE_CODE_SUBAGENT_EFFORT);
}
//@ chunk-kswt4qha.js:22970-23089 fingerprint = getEffortEnvOverride (1)
/**
 * CLAUDE_CODE_EFFORT_LEVEL：unset/auto 返回 null（强制不设），否则解析出的级别或数字；未设置为 undefined。
 */
function getEffortEnvOverride() {
  let envOverride = env.CLAUDE_CODE_EFFORT_LEVEL;
  return envOverride?.toLowerCase() === "unset" || envOverride?.toLowerCase() === "auto"
    ? null
    : parseEffortValue(envOverride);
}
//@ chunk-kswt4qha.js:23089-23164 layout = resolveAgentModelDisplay (0.819)
/**
 * 模型选择常量 {kind:"inherit"} 与 {kind:"default"}。
 */
var INHERIT_EFFORT_SETTING = Object.freeze({
  kind: "inherit",
});
var DEFAULT_EFFORT_SETTING = Object.freeze({
  kind: "default",
});
//@ chunk-kswt4qha.js:23164-23209 layout
/**
 * {kind:"level", value}。
 */
function levelEffortSetting(value) {
  return {
    kind: "level",
    value,
  };
}
//@ chunk-kswt4qha.js:23209-23253 layout
/**
 * undefined → default，否则 level。
 */
function toEffortSettingOrDefault(e) {
  return e === undefined ? DEFAULT_EFFORT_SETTING : levelEffortSetting(e);
}
//@ chunk-kswt4qha.js:23253-23297 layout
/**
 * undefined → inherit，否则 level。
 */
function toEffortSettingOrInherit(effortOrKeyword) {
  return effortOrKeyword === undefined ? INHERIT_EFFORT_SETTING : levelEffortSetting(effortOrKeyword);
}
//@ chunk-kswt4qha.js:23297-23358 layout
/**
 * 级别设置返回其字符串，否则 null。
 */
function effortSettingToString(sessionEffort) {
  return sessionEffort.kind === "level" ? String(sessionEffort.value) : null;
}
//@ chunk-kswt4qha.js:23358-23431 layout
/**
 * 非空且不超过 128 字符的字符串，否则 null。
 */
function toBoundedLabel(e) {
  return typeof e === "string" && e !== "" && e.length <= MAX_REQUEST_ID_LENGTH ? e : null;
}
//@ chunk-kswt4qha.js:23431-23536 layout
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
//@ chunk-kswt4qha.js:23536-23919 layout
/**
 * isLegacyUserEffortModel 的结果缓存。
 */
var LEGACY_USER_EFFORT_MODELS = new Set([
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
var legacyUserEffortCache = new Map();
//@ chunk-kswt4qha.js:23919-24010 layout
/**
 * 模型在旧式名单内或名字无法解析为版本化模型时，顶层用户 effortLevel 对其生效。
 */
function isLegacyUserEffortModel(modelSettingsKey) {
  let n = legacyUserEffortCache.get(modelSettingsKey);
  if (n === undefined) {
    n = LEGACY_USER_EFFORT_MODELS.has(modelSettingsKey) || !isStandardVersion(parseModelId(modelSettingsKey));
    legacyUserEffortCache.set(modelSettingsKey, n);
  }
  return n;
}
//@ chunk-kswt4qha.js:24010-24367 layout
/**
 * 首次启动版本未记录时、尚未解除“发布期默认 effort 固定”的模型（opus-4-7、opus-4-8、fable-5 及 ANTHROPIC_DEFAULT_FABLE_MODEL）。
 */
function getLaunchEffortPinnedModels() {
  let globalConfig = getGlobalConfig();
  if (globalConfig.firstStartVersion !== undefined) return [];
  let n = [];
  if (!globalConfig.unpinOpus47LaunchEffort) n.push("claude-opus-4-7");
  if (!globalConfig.unpinOpus48LaunchEffort) n.push("claude-opus-4-8");
  if (!globalConfig.unpinFable5LaunchEffort) {
    n.push("claude-fable-5");
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
      n.push(getModelSettingsKey(ANTHROPIC_DEFAULT_FABLE_MODEL));
  }
  return n;
}
//@ chunk-kswt4qha.js:24367-24738 layout
/**
 * 按优先级列出带设置的来源（flagSettings 展开为 project/local；去重同一文件）。
 */
function getEffortSettingsSources() {
  let e = new Set();
  let n = [];
  for (let r of getEnabledSettingSources()) {
    if (r === "flagSettings") {
      let [d, u] = approvalLayers();
      if (d !== undefined)
        n.push({
          source: "projectSettings",
          settings: d,
        });
      if (u !== undefined)
        n.push({
          source: "localSettings",
          settings: u,
        });
    }
    let settingsFilePathForSource = getSettingsFilePathForSource(r);
    if (settingsFilePathForSource !== undefined) {
      let d = resolve(settingsFilePathForSource);
      if (e.has(d) && r !== "flagSettings") continue;
      e.add(d);
    }
    let settingsForSource = getSettingsForSource(r);
    if (settingsForSource !== undefined && settingsForSource !== null)
      n.push({
        source: r,
        settings: settingsForSource,
      });
  }
  return n;
}
//@ chunk-kswt4qha.js:24738-25757 layout
/**
 * 构建 effort 设置表：{default（非用户来源的顶层 effortLevel）, legacyUserEffort（用户设置顶层）, byModel（各来源 modelSettings.<模型>.effortLevel，按优先级取第一个）}；组织覆盖与发布期固定模型强制为 undefined。
 */
function buildEffortSettingsTable() {
  let effortSettingsSources = getEffortSettingsSources();
  let orgModelDefaultCache = getOrgModelDefaultCache();
  let r =
    orgModelDefaultCache !== null && orgOverridesUserEffort(orgModelDefaultCache.name)
      ? getModelSettingsKey(orgModelDefaultCache.name)
      : undefined;
  let s;
  let f;
  let d = [];
  for (let { source, settings } of effortSettingsSources) {
    let y = settings.effortLevel !== undefined;
    if (source === "userSettings") {
      s = toPersistableEffort(settings.effortLevel);
      d.push({
        source,
        setsTopLevel: false,
        settings,
      });
      continue;
    }
    if (y)
      f = {
        level: toPersistableEffort(settings.effortLevel),
      };
    d.push({
      source,
      setsTopLevel: y,
      settings,
    });
  }
  d.reverse();
  let mapped = d.map(({ settings }) => {
    let h = new Map();
    for (let [key, value] of Object.entries(settings.modelSettings ?? {})) {
      let effortLevel = value?.effortLevel;
      if (effortLevel === undefined) continue;
      let modelSettingsKey = getModelSettingsKey(key);
      if (key === modelSettingsKey || !h.has(modelSettingsKey)) h.set(modelSettingsKey, effortLevel);
    }
    return h;
  });
  let E = new Set();
  if (r !== undefined) E.add(r);
  for (let S of mapped) for (let key of S.keys()) E.add(key);
  let m = {};
  for (let S of E) {
    if (S === r) m[S] = undefined;
    for (let k = 0; k < d.length; k++) {
      if (S === r && !isReadOnlySettingSource(d[k].source)) continue;
      let y = mapped[k].get(S);
      if (y !== undefined) {
        m[S] = toPersistableEffort(y);
        break;
      }
      if (d[k].setsTopLevel) {
        m[S] = toPersistableEffort(d[k].settings.effortLevel);
        break;
      }
    }
  }
  if (f !== undefined) s = undefined;
  if (s !== undefined) {
    for (let S of getLaunchEffortPinnedModels())
      if (!Object.hasOwn(m, S) && !Object.hasOwn(Object.prototype, S)) m[S] = undefined;
  }
  return {
    default: f?.level,
    legacyUserEffort: s,
    byModel: m,
  };
}
//@ chunk-kswt4qha.js:25757-25820 layout = getEnabledSettingSources (1)
/**
 * policySettings 或 flagSettings。旧版名错配。
 */
function isReadOnlySettingSource(source) {
  return source === "policySettings" || source === "flagSettings";
}
//@ chunk-kswt4qha.js:25820-25898 layout
/**
 * 组织强制 effort 时该模型的生效级别。
 */
function getOrgOverriddenEffort(e) {
  if (!orgOverridesUserEffort(e)) return null;
  return normalizeEffortLevel(
    resolveAppliedEffort(
      lookupEffortSetting(buildEffortSettingsTable(), e) ?? getDefaultEffortForModel(e),
      e,
    ),
  );
}
//@ chunk-kswt4qha.js:25898-26086 layout
/**
 * 从 effort 设置表取模型的 effort：byModel → default → 旧式用户设置（仅旧模型）。
 */
function lookupEffortSetting(e, n) {
  let modelSettingsKey = getModelSettingsKey(n);
  if (Object.hasOwn(e.byModel, modelSettingsKey)) return e.byModel[modelSettingsKey];
  if (e.default !== undefined || e.legacyUserEffort === undefined) return e.default;
  return isLegacyUserEffortModel(modelSettingsKey) ? e.legacyUserEffort : undefined;
}
//@ chunk-kswt4qha.js:26086-26182 layout
/**
 * 设置表没有旧式用户值也没有按模型条目。
 */
function isEffortSettingsTableEmpty(settingsEffortTable) {
  if (settingsEffortTable.legacyUserEffort !== undefined) return false;
  for (let key in settingsEffortTable.byModel) return false;
  return true;
}
//@ chunk-kswt4qha.js:26182-26250 layout
/**
 * 模型在 settings.modelSettings 里的键（去 [1m]、确定性规范名）。
 */
function getModelSettingsKey(e) {
  return strip1mSuffix(
    getCanonicalName(resolveModelAliasSpelling(e), {
      deterministic: true,
      identity: true,
    }),
  );
}
//@ chunk-kswt4qha.js:26250-26313 fingerprint = getInitialEffortSetting (1)
/**
 * 生成按模型保存 effort 的设置补丁 {modelSettings:{<模型键>:{effortLevel}}}。
 */
function getInitialEffortSetting(e, effortLevel) {
  return buildModelSettingsPatch(
    e,
    {
      effortLevel,
    },
    {
      effortLevel,
    },
  );
}
//@ chunk-kswt4qha.js:26313-26412 layout
/**
 * 模型键是 Object.prototype 上的名字时用回退补丁，防原型污染。
 */
function buildModelSettingsPatch(e, n, r) {
  let modelSettingsKey = getModelSettingsKey(e);
  return Object.hasOwn(Object.prototype, modelSettingsKey)
    ? r
    : {
        modelSettings: {
          [modelSettingsKey]: n,
        },
      };
}
//@ chunk-kswt4qha.js:26412-26483 placement
/**
 * 按当前账号从全局配置取该模型的 effort 设置。
 */
function userEffortForAccount(e) {
  let accountUuid = getOauthAccountInfo()?.accountUuid;
  return accountUuid !== undefined && isAutoCompactOfferAnswered(getGlobalConfig(), accountUuid, e);
}
//@ chunk-kswt4qha.js:26483-26864 placement = _temp8 (0.203)
/**
 * 取当前会话生效的推理强度：会话显式等级直接返回，default 返回 undefined；inherit 时按设置里的按模型强度表查当前主循环模型（withHold 时若模型自带强度则不覆盖）。
 */
function resolveEffortLevel(e, n, { withHold: r = true } = {}) {
  let sessionEffort = e.sessionEffort ?? INHERIT_EFFORT_SETTING;
  switch (sessionEffort.kind) {
    case "level":
      return sessionEffort.value;
    case "default":
      return;
    case "inherit": {
      if (e.settingsEffortTable === undefined) return;
      if (isEffortSettingsTableEmpty(e.settingsEffortTable) && !hasCarriedRefusalEffort())
        return e.settingsEffortTable.default;
      let f =
        n ??
        parseUserSpecifiedModel(e.mainLoopModelForSession ?? e.mainLoopModel ?? getDefaultMainLoopModel());
      return r && carriedEffortOnly(f) !== undefined
        ? undefined
        : lookupEffortSetting(e.settingsEffortTable, f);
    }
  }
}
//@ chunk-kswt4qha.js:26864-26903 placement
/**
 * 判断两个模型是否共用同一设置键。
 */
function isSameModelSettings(e, mainLoopModel) {
  return getModelSettingsKey(e) === getModelSettingsKey(mainLoopModel);
}
//@ chunk-kswt4qha.js:26903-26955 placement
/**
 * 解析 effort 级别（不做保留）。
 */
function resolveEffortWithoutHold(appState, n) {
  return resolveEffortLevel(withoutSessionLevel(appState), n, {
    withHold: false,
  });
}
//@ chunk-kswt4qha.js:26955-27037 placement
/**
 * 把会话里的显式级别改为继承，再解析 effort。
 */
function withoutSessionLevel(e) {
  return e.sessionEffort?.kind === "level"
    ? {
        ...e,
        sessionEffort: INHERIT_EFFORT_SETTING,
      }
    : e;
}
//@ chunk-kswt4qha.js:27037-27119 placement
/**
 * 取 effort 级别值。
 */
function effortLevelValue(e) {
  return e.kind === "level" && typeof e.value === "string" ? e.value : undefined;
}
//@ chunk-kswt4qha.js:27119-27430 layout
/**
 * 本次请求的 effort（output_config.effort 的来源）：模型不支持 → undefined；钩子值 > CLAUDE_CODE_EFFORT_LEVEL（unset/auto → 不发）> 本轮 effort > 会话设置 > 默认（getDefaultEffortForModel）；最后经 resolveAppliedEffort 夹取。
 */
function resolveEffortValue(
  e,
  n,
  { turnEffort: r, hookEffortValue: s, carriedEffort: f = getCarriedRefusalEffort(e) } = {},
) {
  if (!modelSupportsEffort(e)) return;
  let d = getSettingsMaxEffort(e) !== null;
  if (s !== undefined) {
    let S = typeof s === "number" && d ? normalizeEffortLevel(s) : s;
    return resolveAppliedEffort(S, e);
  }
  let effortEnvOverride = getEffortEnvOverride();
  if (effortEnvOverride === null && !d) return;
  let defaultEffortForModel = getDefaultEffortForModel(e, f);
  let m =
    effortEnvOverride ??
    (effortEnvOverride === null ? defaultEffortForModel : undefined) ??
    r ??
    n ??
    defaultEffortForModel;
  if (typeof m === "number" && d) m = normalizeEffortLevel(m);
  return resolveAppliedEffort(m, e);
}
//@ chunk-kswt4qha.js:27430-27562 layout
/**
 * 模型支持 effort 且无环境覆盖时：给定字符串按组织上限截断；未给且组织默认 effort 存在时用模型默认 effort。
 */
function getModelPickerEffortDefault(e, n) {
  if (!modelSupportsEffort(e) || getEffortEnvOverride() !== undefined) return;
  if (typeof n === "string") return clampEffortToCap(n, e);
  if (n === undefined && getOrgDefaultEffort(e)) return getDefaultEffortLevel(e);
  return;
}
//@ chunk-kswt4qha.js:27562-27702 fingerprint = resolveAppliedEffort (0.778)
/**
 * 把请求的 effort 落到模型能接受的值：先按组织上限截断，max/xhigh 不支持时降为 high。
 */
function resolveAppliedEffort(model, appStateEffortValue) {
  let r = model;
  if (typeof r === "string" && isEffortLevel(r)) r = clampEffortToCap(r, appStateEffortValue);
  if (r === "max" && !modelSupportsMaxEffort(appStateEffortValue)) r = "high";
  if (r === "xhigh" && !modelSupportsXhighEffort(appStateEffortValue)) r = "high";
  return r;
}
//@ chunk-kswt4qha.js:27702-27743 layout
/**
 * 模型默认 effort（规范为级别）。
 */
function getDefaultEffortLevel(e) {
  return normalizeEffortLevel(resolveAppliedEffort(getDefaultEffortForModel(e), e));
}
//@ chunk-kswt4qha.js:27743-27779 layout
/**
 * 模型支持每轮 effort 控制（per-turn-control beta）且会话未关闭它。
 */
function modelSupportsPerTurnEffortControl(e) {
  return usesPerTurnEffortBeta(e, getCanonicalName(e));
}
//@ chunk-kswt4qha.js:27779-27914 layout
/**
 * ultrathink 可用（tengu_turtle_carbon 等）、模型可调 effort 且把本轮 effort 设为 xhigh 能生效。
 */
function isUltrathinkEffective(e, n) {
  return (
    isUltrathinkEnabled() &&
    (!getIsNonInteractiveSession() || (isVsCodeOrDesktop() && isVirtualPancakeEnabled())) &&
    isEffortAdjustable(e) &&
    modelSupportsPerTurnEffortControl(e) &&
    typeof resolveEffortValue(e, n) === "string" &&
    resolveEffortValue(e, n, {
      turnEffort: "xhigh",
    }) === "xhigh"
  );
}
//@ chunk-kswt4qha.js:27914-27971 layout
/**
 * ultrathink 有效且当前 effort 低于 xhigh。
 */
function shouldUltrathinkRaiseEffort(e, n) {
  return isUltrathinkEffective(e, n) && effortRank(getEffortLevelOrHigh(e, n)) < effortRank("xhigh");
}
//@ chunk-kswt4qha.js:27971-28273 layout
/**
 * 会话中途 effort 实际值发生变化（已有输出、模型支持、非受限）时为真，用于提示 effort 变更。
 */
function shouldShowEffortChangeNotice(target, n, r, ackedAtOutputTokens, promptCacheMayBeWarm) {
  if (!promptCacheMayBeWarm) return false;
  let totalOutputTokens = getTotalOutputTokens();
  if (totalOutputTokens === 0 || totalOutputTokens === ackedAtOutputTokens) return false;
  if (!modelSupportsEffort(r)) return false;
  if (
    typeof resolveEffortValue(r, target) !== "number" &&
    typeof resolveEffortValue(r, n) !== "number" &&
    modelSupportsPerTurnEffortControl(r)
  )
    return false;
  if (
    resolveEffortValue(r, target, {
      carriedEffort: null,
    }) === resolveEffortValue(r, n)
  )
    return false;
  if (
    isRemoteControlChannelAvailable() &&
    target !== undefined &&
    toPersistableEffort(typeof target === "string" ? clampEffortToCap(target, r) : target) === undefined
  )
    return false;
  return true;
}
//@ chunk-kswt4qha.js:28273-28341 layout = _temp5 (1)
/**
 * 写 userSettings 的 effortLevel。
 */
async function saveEffortToUserSettings(effortLevel, n, r) {
  return updateSettingsForSource("userSettings", getInitialEffortSetting(n, effortLevel), undefined, r);
}
//@ chunk-kswt4qha.js:28341-28497 layout
/**
 * 需要持久化且级别可保存时写用户设置，返回错误（如有）。
 */
async function persistEffortSetting(e, n, r = true, storageV5) {
  let f = e !== undefined ? toPersistableEffort(e) : undefined;
  if (r && (e === undefined || f !== undefined) && !getRemoteCaps()) {
    let d = await saveEffortToUserSettings(f, n, storageV5);
    if (d.error) return d.error;
  }
  return;
}
//@ chunk-kswt4qha.js:28497-28588 layout
/**
 * 初始会话 effort 状态 {sessionEffort, settingsEffortTable}。
 */
function createSessionEffortState(effort) {
  let n = {
    sessionEffort: toEffortSettingOrInherit(parseEffortOrKeyword(effort)),
    settingsEffortTable: buildEffortSettingsTable(),
  };
  setMainLoopEffortState(n);
  return n;
}
//@ chunk-kswt4qha.js:28588-28668 layout
/**
 * resolveEffortValue 的级别形式。
 */
function getAppliedEffortLevel(e, n, turnEffort) {
  let effortValue = resolveEffortValue(e, n, {
    turnEffort,
  });
  return effortValue === undefined ? undefined : normalizeEffortLevel(effortValue);
}
//@ chunk-kswt4qha.js:28668-28713 layout = getDefaultEffortLevelForOption (1)
/**
 * 生效的 effort 级别，未设置时视为 high。
 */
function getEffortLevelOrHigh(e, n, r) {
  return getAppliedEffortLevel(e, n, r) ?? "high";
}
//@ chunk-kswt4qha.js:28713-28762 layout
/**
 * 模型支持 effort 时返回生效级别（默认 high），否则 undefined。
 */
function getEffortLevelIfSupported(mainLoopModel, n, effortLayerOverride) {
  return modelSupportsEffort(mainLoopModel)
    ? getEffortLevelOrHigh(mainLoopModel, n, effortLayerOverride)
    : undefined;
}
//@ chunk-kswt4qha.js:28762-28908 fingerprint = getEffortSuffix (0.86)
/**
 * 显示用后缀 " with <level> effort"。
 */
function getEffortSuffix(model, effortValue, r, s) {
  if (effortValue === undefined && r === undefined) return "";
  let resolved =
    s ??
    resolveEffortValue(model, effortValue, {
      turnEffort: r,
    });
  if (resolved === undefined) return "";
  return ` with ${effortValueToString(normalizeEffortLevel(resolved))} effort`;
}
//@ chunk-kswt4qha.js:28908-28950 layout
/**
 * 数值 effort（旧版 isValidNumericEffort）。
 */
function isIntegerEffort(e) {
  return Number.isInteger(e);
}
//@ chunk-kswt4qha.js:28950-29023 layout = getDefaultEffortLevelForOption (1)
/**
 * 数值或非法值统一当作 high，合法级别原样返回。
 */
function normalizeEffortLevel(value) {
  if (typeof value === "string") return isEffortLevel(value) ? value : "high";
  return "high";
}
//@ chunk-kswt4qha.js:29023-29452 fingerprint = getEffortLevelDescription (0.802)
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
//@ chunk-kswt4qha.js:29452-29693 callgraph-witnessed = getEffortValueDescription (0.328)
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
//@ chunk-kswt4qha.js:29693-29782 layout
/**
 * 模型默认 effort：GrowthBook tengu_witty_wand 按模型配置 > 组织默认 > fallback 携带的 effort > 服务端目录 > 配置 default_effort > catalog default_effort（缺省 high）。
 */
function getDefaultEffortForModel(model, n) {
  let r = remoteDefaultEffort(model);
  return (
    (r === undefined ? n : undefined) ??
    getOrgDefaultEffort(model) ??
    r ??
    modelEffortOverride(model) ??
    getConfiguredDefaultEffort(model) ??
    getDisplayedEffortLevel(model)
  );
}
//@ chunk-kswt4qha.js:29782-29876 layout
/**
 * 配置里该模型的 default_effort（模型需支持该级别）。
 */
function getConfiguredDefaultEffort(e) {
  let defaultEffort = getCachedClientData(e)?.default_effort;
  return typeof defaultEffort === "string" &&
    isEffortLevel(defaultEffort) &&
    modelSupportsEffortLevel(e, defaultEffort)
    ? defaultEffort
    : undefined;
}
//@ chunk-kswt4qha.js:29876-29945 placement
/**
 * 只有沿用的 effort 时返回它。
 */
function carriedEffortOnly(e) {
  let carriedRefusalEffort = getCarriedRefusalEffort(e);
  return carriedRefusalEffort !== undefined && remoteDefaultEffort(e) === undefined
    ? carriedRefusalEffort
    : undefined;
}
//@ chunk-kswt4qha.js:29945-30012 placement
/**
 * 判断是否存在组织默认、远端默认或携带的 effort。
 */
function hasAnyDefaultEffort(mainLoopModel) {
  return (
    getOrgDefaultEffort(mainLoopModel) !== null ||
    remoteDefaultEffort(mainLoopModel) !== undefined ||
    getCarriedRefusalEffort(mainLoopModel) !== undefined
  );
}
//@ chunk-kswt4qha.js:30012-30061 placement
/**
 * effort 覆盖值的 schema。
 */
var TENGU_WITTY_WAND = "tengu_witty_wand";
var effortOverrideSchema = DoctorLazy(() => record(string(), unknown()));
//@ chunk-kswt4qha.js:30061-30279 placement
function remoteDefaultEffort(e) {
  let featureValue_CACHED_MAY_BE_STALE = getFeatureValue_CACHED_MAY_BE_STALE(TENGU_WITTY_WAND, {});
  if (typeof featureValue_CACHED_MAY_BE_STALE === "string")
    featureValue_CACHED_MAY_BE_STALE = safeParseJSON(featureValue_CACHED_MAY_BE_STALE, false);
  let r = effortOverrideSchema().safeParse(featureValue_CACHED_MAY_BE_STALE);
  if (!r.success) return;
  let s = r.data[strip1mSuffix(getCanonicalName(e))];
  let f = typeof s === "string" ? s.trim().toLowerCase() : undefined;
  return f !== undefined && isEffortLevel(f) ? f : undefined;
}
//@ chunk-kswt4qha.js:30279-30347 placement
/**
 * 取模型的 effort 覆盖值（只接受合法级别）。
 */
function modelEffortOverride(e) {
  let n = servedDefaultEffort(e, getCanonicalName(e));
  return n !== undefined && isEffortLevel(n) ? n : undefined;
}
//@ chunk-kswt4qha.js:30347-30403 placement
function getDisplayedEffortLevel(model) {
  return getCatalogEntry(getCanonicalName(model))?.default_effort ?? "high";
}
//@ chunk-kswt4qha.js:30403-30502 placement
/**
 * 判断环境与携带值都没有设置 effort。
 */
function isEffortUnset(queuedMessageText, mainLoopModel) {
  let r = getRemoteCaps() ? undefined : getEffortEnvOverride();
  return (
    (r === null || (r === undefined && queuedMessageText === undefined)) &&
    carriedEffortOnly(mainLoopModel) === undefined
  );
}
//@ chunk-kswt4qha.js:30502-30527 placement
/**
 * 恒返回 undefined 的 effort 提示（占位）。
 */
function noEffortHint(e, n) {
  return;
}
//@ chunk-18hwfzwa.js:675600-675889 callgraph-fingerprint = convertEffortValueToLevel (0.529)
/**
 * 模型选择器某选项的 effort 能力：是否支持 effort/max/xhigh、可选级别（受组织上限）与默认 effort。旧版名 convertEffortValueToLevel 为错配。
 */
function getEffortCapabilitiesForOption(value) {
  let modelOptionValue = resolveModelOptionValue(value);
  let D = defaultEffortForModel(value);
  if (!modelOptionValue)
    return {
      supportsEffort: false,
      supportsMax: false,
      supportsXHigh: false,
      capLevels: ["low", "medium", "high"],
      defaultEffort: D,
    };
  return {
    supportsEffort: modelSupportsEffort(modelOptionValue),
    supportsMax: modelSupportsMaxEffort(modelOptionValue) && isEffortWithinCap("max", modelOptionValue),
    supportsXHigh: modelSupportsXhighEffort(modelOptionValue) && isEffortWithinCap("xhigh", modelOptionValue),
    capLevels: getAllowedEffortLevels(modelOptionValue),
    defaultEffort: clampEffortToCap(D, modelOptionValue),
  };
}
//@ chunk-18hwfzwa.js:1101574-1101734 placement
/**
 * 某推理强度相对默认强度的成本比。
 */
function effortCostRatio(h, x) {
  if (!modelSupportsEffort(h)) return null;
  let effortCostIndex = getCatalogEntry(getCanonicalName(h))?.effort_cost_index;
  if (!effortCostIndex) return null;
  let L = effortCostIndex[x];
  let ee = effortCostIndex[getDefaultEffortLevel(h)];
  if (L === undefined || !ee) return null;
  return L / ee;
}
//@ chunk-dcmhvw5a.js:189583-189628 callgraph-witnessed = EFFORT_LEVELS (0.879)
/**
 * effort 级别从低到高：low、medium、high、xhigh、max。
 */
var EFFORT_LEVELS = ["low", "medium", "high", "xhigh", "max"];
//@ chunk-dcmhvw5a.js:189628-189681 placement
/**
 * 级别 a 是否高于 b（按 EFFORT_LEVELS 顺序）。
 */
function isEffortHigherThan(e, n) {
  return EFFORT_LEVELS.indexOf(e) > EFFORT_LEVELS.indexOf(n);
}
//@ chunk-kcvmr83c.js:1382-1457 placement = getEffortEnvOverride (0.817)
function getEffortEnvOverride_2(e) {
  let lower = e.toLowerCase();
  return lower === "auto" || lower === "unset" || isReservedEffortKeyword(lower);
}
//@ chunk-kcvmr83c.js:1457-1538 placement
function parseEffortArg(e) {
  if (getEffortEnvOverride_2(e))
    return {
      value: undefined,
    };
  let effortLevel = parseEffortLevel(e);
  return effortLevel
    ? {
        value: effortLevel,
      }
    : null;
}
//@ chunk-3rwvzn82.js:29349-29425 placement = getRequestTooLargeErrorMessage (1)
/**
 * effort 级别说明：模型有特定说明时用之，max 级用"May use excessive tokens..."提示。旧版名 getRequestTooLargeErrorMessage 为错配；应归 utils/effort.ts。
 */
function getEffortLevelDescription(mainLoopModel, l) {
  if (hasEffortOverride(mainLoopModel)) return describeEffortLevel(mainLoopModel, l.value);
  return l.value === "max" ? MAX_EFFORT_DESCRIPTION : "";
}
export {
  getEffortLevelIfSupported,
  resolveEffortLevel,
  resolveEffortValue,
  modelSupportsEffort,
  EFFORT_LEVELS,
  modelSupportsMaxEffort,
  modelSupportsXhighEffort,
  isEffortLevel,
  getEffortEnvOverride,
  INHERIT_EFFORT_SETTING,
  buildEffortSettingsTable,
  modelSupportsPerTurnEffortControl,
  isUltracodeActive,
  parseEffortValue,
  findAdjacentEffortLevel,
  createSessionEffortState,
  isUltracodeEnabled,
  parseEffortFlag,
  parseEffortLevel,
  effortLevelValue,
  persistEffortSetting,
  levelEffortSetting,
  getAppliedEffortLevel,
  isUltrathinkEffective,
  getModelSettingsKey,
  orgOverridesUserEffort,
  getEffortLevelOrHigh,
  getEffortSettingsSources,
  isLegacyUserEffortModel,
  normalizeEffortLevel,
  getEffortCapabilitiesForOption,
  clampEffortToCap,
  getDefaultEffortLevel,
  toBoundedLabel,
  isUltracodeAvailable,
  shouldShowEffortHint,
  shouldShowEffortChangeNotice,
  effortValueToString,
  isOnlyMaxAboveEffort,
  toPersistableEffort,
  effortCostRatio,
  noEffortHint,
  getModelPickerEffortDefault,
  isEffortHintFlagOn,
  isEffortHigherThan,
  resolveAppliedEffort,
  isAboveHighEffort,
  THINKING_DISABLED_EFFORT_CAP,
  getEffortCapWarning,
  shouldUltrathinkRaiseEffort,
  getEffortSuffix,
  parseEffortArg,
  getOrgDefaultEffort,
  getEffortCap,
  hasEffortLevelsAboveCap,
  getOrgOverriddenEffort,
  isEffortUnset,
  getEffortLevelDescription,
  getAllowedEffortLevels,
  getEffortValueDescription,
  carriedEffortOnly,
  getEffortEnvOverride_2,
  toEffortSettingOrDefault,
  isSameEffortSetting,
  getDefaultEffortForModel,
  hasAnyDefaultEffort,
  resolveEffortKeyword,
  effortSettingToString,
  isRequestedEffortTheHeldLevel,
  parseEffortKeyword,
  isEffortChangedFromSession,
  lookupEffortSetting,
  isSameModelSettings,
  resolveEffortWithoutHold,
  modelCapsEffortWhenThinkingDisabled,
  getSubagentEffortOverride,
  withoutSessionLevel,
  userEffortForAccount,
  buildModelSettingsPatch,
};
