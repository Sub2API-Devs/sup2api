/**
 * utils/effort.ts
 *
 * effort（推理强度）：级别 low/medium/high/xhigh/max、模型是否支持 effort/xhigh/max、默认 effort 的来源顺序、环境变量与 /effort 覆盖、组织上限截断、按模型保存的 effort 设置。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/effort.ts
 * pieces: chunk-18hwfzwa.js (2), chunk-3rwvzn82.js (1), chunk-dcmhvw5a.js (1), chunk-kcvmr83c.js (2), chunk-kswt4qha.js (94)
 * attribution: callgraph-fingerprint 4, placement 18, callgraph-witnessed 2, layout 68, file-local 3, fingerprint 5
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
import { fOt, modelSupportsCapability, getCatalogEntry } from "./model/modelCatalog.js";
import { modelEffortLevels, twi } from "./model/modelCatalog/servedCatalog.js";
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
  j,
  q,
  re,
  getCarriedRefusalEffort,
  isVirtualPancakeEnabled,
  oQr,
  isReservedEffortKeyword,
} from "./permissions/permissionSetup.js";
import { strip1mTag, resolveModelAliasSpelling } from "./model/model.js";
import {
  getModelAccessCache,
  getOrgModelDefaultCache,
  getOauthAccountInfo,
  isProSubscriber,
} from "./auth.js";
import { wt, ml, Jn } from "../remote/remoteMode.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../services/analytics/growthbook.js";
import { MAX_REQUEST_ID_LENGTH } from "./controlMessageCompat.js";
import { wR, parseModelId, Lt } from "./model/modelIds.js";
import { getGlobalConfig, getCachedClientData } from "./config.js";
import { e5e } from "./model/fableMitigations.js";
import { parseUserSpecifiedModel } from "./model/modelDisplay.js";
import { getDefaultMainLoopModel } from "./model/modelFallback.js";
import { Vpr } from "./betas.js";
import { isUltrathinkEnabled } from "./thinking.js";
import { isVsCodeOrDesktop } from "./sessionShape.js";
import { MAX_EFFORT_DESCRIPTION } from "./settings/permissionRuleCarveOut.js";
import { DoctorLazy } from "../cli/handlers/util.js";
import { pe, o, oe } from "../../vendor/zod/v4/classic/schemas.js";
import { safeParseJSON } from "./json.js";
import { Ow, Hme } from "../components/ModelPicker.js";
import { eo, describeEffortLevel } from "../components/EffortSlider.js";

/**
 * 模型是否支持 effort：被 API 拒绝过的模型为 false；3P 能力覆盖 → CLAUDE_CODE_MODEL_CAPABILITIES → 服务端目录 effort_levels → 旧模型黑名单 → CLAUDE_CODE_ALWAYS_ENABLE_EFFORT → catalog 能力 effort → 第一方类提供商默认支持。
 */
//@ chunk-kswt4qha.js:17736-18187 callgraph-fingerprint = modelSupportsEffort (0.2)
function modelSupportsEffort(model) {
  if (isEffortMarkedUnsupported(model)) return !1;
  let n = getCapabilityOverrideCached(model, "effort");
  if (n !== void 0) return n;
  let r = getCanonicalName(model),
    supported3P = fOt("effort", r);
  if (supported3P !== void 0) return supported3P;
  let f = modelEffortLevels(model, r);
  if (f !== void 0) return f.length > 0;
  if (
    r.includes("claude-3-") ||
    r === "claude-opus-4-0" ||
    r === "claude-opus-4-1" ||
    r === "claude-sonnet-4-0" ||
    r === "claude-sonnet-4-5" ||
    r === "claude-haiku-4-5"
  )
    return !1;
  if (env.CLAUDE_CODE_ALWAYS_ENABLE_EFFORT) return !0;
  if (modelSupportsCapability(r, "effort", model) || r === "claude-mythos-5") return !0;
  return hasFirstPartyCapabilities(getProviderForModel(model));
}
/**
 * 模型是否支持 max effort，判定顺序同 modelSupportsEffort（能力 max_effort）。
 */
//@ chunk-kswt4qha.js:18187-18635 callgraph-fingerprint = modelSupportsMaxEffort (0.162)
function modelSupportsMaxEffort(model) {
  if (isEffortMarkedUnsupported(model)) return !1;
  let supported3P = getCapabilityOverrideCached(model, "max_effort");
  if (supported3P !== void 0) return supported3P;
  let r = getCanonicalName(model),
    s = getCatalogEffortCapability("max_effort", model, r);
  if (s !== void 0) return s;
  let f = modelEffortLevels(model, r);
  if (f !== void 0) return f.includes("max");
  if (
    r.includes("claude-3-") ||
    r === "claude-opus-4-0" ||
    r === "claude-opus-4-1" ||
    r === "claude-opus-4-5" ||
    r === "claude-sonnet-4-0" ||
    r === "claude-sonnet-4-5" ||
    r === "claude-haiku-4-5"
  )
    return !1;
  if (modelSupportsCapability(r, "max_effort", model) || r === "claude-mythos-5") return !0;
  return hasFirstPartyCapabilities(getProviderForModel(model));
}
/**
 * 模型是否支持 xhigh effort：被 API 拒过 effort → 否；能力覆盖；catalog 能力 xhigh_effort；服务端 effort_levels；早于 opus-4-7 的老模型否；mythos-5 是；其余第一方系提供商是。
 */
//@ chunk-kswt4qha.js:18635-19139 layout
function modelSupportsXhighEffort(e) {
  if (isEffortMarkedUnsupported(e)) return !1;
  let n = getCapabilityOverrideCached(e, "xhigh_effort");
  if (n !== void 0) return n;
  let r = getCanonicalName(e),
    s = getCatalogEffortCapability("xhigh_effort", e, r);
  if (s !== void 0) return s;
  let f = modelEffortLevels(e, r);
  if (f !== void 0) return f.includes("xhigh");
  if (
    r.includes("claude-3-") ||
    r === "claude-opus-4-0" ||
    r === "claude-opus-4-1" ||
    r === "claude-opus-4-5" ||
    r === "claude-opus-4-6" ||
    r === "claude-sonnet-4-0" ||
    r === "claude-sonnet-4-5" ||
    r === "claude-sonnet-4-6" ||
    r === "claude-haiku-4-5"
  )
    return !1;
  if (modelSupportsCapability(r, "xhigh_effort", e) || r === "claude-mythos-5") return !0;
  return hasFirstPartyCapabilities(getProviderForModel(e));
}
/**
 * catalog 能力查询，且 effort 能力没被关闭（effort=false 时直接 false）。
 */
//@ chunk-kswt4qha.js:19139-19243 layout
function getCatalogEffortCapability(e, n, r) {
  if (fOt("effort", r) === !1) return !1;
  let s = fOt(e, r);
  if (s === void 0) return;
  return s && modelSupportsEffort(n);
}
/**
 * 同 modelSupportsXhighEffort（ultracode 映射到 xhigh）。
 */
//@ chunk-kswt4qha.js:19243-19272 layout
function modelSupportsUltracode(e) {
  return modelSupportsXhighEffort(e);
}
/**
 * 工作流（Workflow）可用且模型支持 xhigh（模型未给时只看工作流）。
 */
//@ chunk-kswt4qha.js:19272-19320 layout
function isUltracodeAvailable(e) {
  return isWorkflowsAvailable() && (e === void 0 || modelSupportsUltracode(e));
}
/**
 * ultracode 设置为 true 且可用。
 */
//@ chunk-kswt4qha.js:19320-19358 layout
function isUltracodeActive(e, n) {
  return e === !0 && isUltracodeAvailable(n);
}
/**
 * 新 effort 与会话 effort（或当前生效值）是否不同（考虑上限夹取）。
 */
//@ chunk-kswt4qha.js:19358-19528 layout
function isEffortChangedFromSession(e, n, r) {
  if (n.sessionEffort?.kind === "level") {
    let s = n.sessionEffort.value;
    return !(r === s || (typeof r === "string" && isEffortLevel(r) && clampEffortToCap(r, e) === s));
  }
  return getEffortLevelOrHigh(e, resolveEffortLevel(n)) !== getEffortLevelOrHigh(e, r);
}
/**
 * 请求的级别等于“带 hold 的生效 effort”且与不带 hold 时不同（即该级别只是被保持而来）。
 */
//@ chunk-kswt4qha.js:19528-19708 layout
function isRequestedEffortTheHeldLevel(e, n, r) {
  if (r.sessionEffort?.kind === "level" || typeof n !== "string") return !1;
  let s = resolveEffortValue(e, resolveEffortLevel(r, e)),
    f = resolveEffortValue(e, resolveEffortLevel(r, e, { withHold: !1 }), { carriedEffort: null });
  return parseEffortLevel(n) === s && s !== f;
}
/**
 * 是否是 low/medium/high/xhigh/max 之一（旧版同名）。
 */
//@ chunk-kswt4qha.js:19708-19745 file-local
function isEffortLevel(value) {
  return EFFORT_LEVELS.includes(value);
}
/**
 * effort 级别在 EFFORT_LEVELS 中的序号。
 */
//@ chunk-kswt4qha.js:19745-19780 layout
function effortRank(e) {
  return EFFORT_LEVELS.indexOf(e);
}
/**
 * "high"：thinking 关闭时部分模型的 effort 上限（claude.ts 里 clamp 用）。
 */
//@ chunk-kswt4qha.js:19780-19795 layout
var THINKING_DISABLED_EFFORT_CAP = "high";
/**
 * 级别高于 high（xhigh/max）。
 */
//@ chunk-kswt4qha.js:19795-19837 layout
function isAboveHighEffort(e) {
  return isEffortLevel(e) && effortRank(e) > effortRank(THINKING_DISABLED_EFFORT_CAP);
}
/**
 * thinking 关闭时是否限制 effort（catalog 能力 thinking_disabled_effort_cap，默认 opus-5）。
 */
//@ chunk-kswt4qha.js:19837-19932 layout
function modelCapsEffortWhenThinkingDisabled(e) {
  let n = getCanonicalName(e);
  return modelSupportsCapability(n, "thinking_disabled_effort_cap", e) ?? n === "claude-opus-5";
}
/**
 * 各设置来源（含 modelSettings.<模型>.maxEffortLevel）中最严格的 maxEffortLevel；max 视为不设上限。
 */
//@ chunk-kswt4qha.js:19932-20366 layout
function getSettingsMaxEffort(e) {
  let n = [
      ...getAllPolicyTierSettings(),
      ...getEnabledSettingSources().map((f) => getSettingsForSource(f)),
      ...j(),
    ],
    r = n.some((f) => Object.values(f?.modelSettings ?? {}).some((d) => d?.maxEffortLevel !== void 0))
      ? getModelSettingsKey(e)
      : void 0,
    s = null;
  for (let f of n) {
    if (!f) continue;
    let d;
    if (r !== void 0)
      for (let [u, E] of Object.entries(f.modelSettings ?? {})) {
        let m = E?.maxEffortLevel;
        if (m !== void 0 && (d === void 0 || effortRank(m) < effortRank(d)) && getModelSettingsKey(u) === r)
          d = m;
      }
    if (
      ((d ??= f.maxEffortLevel), d !== void 0 && d !== "max" && (s === null || effortRank(d) < effortRank(s)))
    )
      s = d;
  }
  return s;
}
/**
 * 本模型的 effort 上限：设置上限与组织模型访问表（firstParty/gateway 的 maxEffortLevel）取更严格者；max 返回 null。
 */
//@ chunk-kswt4qha.js:20366-20677 layout
function getEffortCap(e) {
  let n = getSettingsMaxEffort(e),
    r = null,
    s = getAPIProvider();
  if (s === "firstParty" || s === "gateway") {
    let d = getCanonicalName(strip1mTag(e.trim().toLowerCase()), { identity: !0 }),
      u = getModelAccessCache().find(
        (E) => getCanonicalName(strip1mTag(E.apiName.trim().toLowerCase()), { identity: !0 }) === d,
      )?.maxEffortLevel;
    r = u != null && isEffortLevel(u) ? u : null;
  }
  let f = r === null ? n : n === null ? r : effortRank(n) < effortRank(r) ? n : r;
  return f === "max" ? null : f;
}
/**
 * 组织默认模型缓存与该模型一致时返回其 default_effort_level（仅第一方）。
 */
//@ chunk-kswt4qha.js:20677-20943 layout
function getOrgDefaultEffort(e) {
  if (getAPIProvider() !== "firstParty") return null;
  let n = getOrgModelDefaultCache();
  if (n === null) return null;
  let default_effort_level = n.default_effort_level;
  if (default_effort_level == null || !isEffortLevel(default_effort_level)) return null;
  let s = getCanonicalName(strip1mTag(e.trim().toLowerCase()), { identity: !0 });
  return getCanonicalName(strip1mTag(n.name.trim().toLowerCase()), { identity: !0 }) === s
    ? default_effort_level
    : null;
}
/**
 * 组织设置 override_user_effort 且该模型有组织默认 effort。
 */
//@ chunk-kswt4qha.js:20943-21014 layout
function orgOverridesUserEffort(e) {
  return getOrgModelDefaultCache()?.override_user_effort === !0 && getOrgDefaultEffort(e) !== null;
}
/**
 * 级别不超过上限（无上限为真）。
 */
//@ chunk-kswt4qha.js:21014-21073 layout
function isEffortWithinCap(e, n) {
  let r = getEffortCap(n);
  return r === null || effortRank(e) <= effortRank(r);
}
/**
 * 上限以内的 effort 级别列表。
 */
//@ chunk-kswt4qha.js:21073-21146 layout
function getAllowedEffortLevels(e) {
  let n = getEffortCap(e);
  return EFFORT_LEVELS.filter((r) => n === null || effortRank(r) <= effortRank(n));
}
/**
 * 超过上限时降到上限。
 */
//@ chunk-kswt4qha.js:21146-21208 layout
function clampEffortToCap(e, n) {
  let r = getEffortCap(n);
  return r !== null && effortRank(e) > effortRank(r) ? r : e;
}
/**
 * xhigh/max 需要模型支持，其他级别都可。
 */
//@ chunk-kswt4qha.js:21208-21289 layout
function modelSupportsEffortLevel(e, n) {
  if (n === "xhigh") return modelSupportsXhighEffort(e);
  if (n === "max") return modelSupportsMaxEffort(e);
  return !0;
}
/**
 * 在模型可用 effort 级别中找比当前高(1)/低一级的级别。应归 utils/effort.ts。
 */
//@ chunk-kswt4qha.js:21289-21416 layout = getRequestTooLargeErrorMessage (0.801)
function findAdjacentEffortLevel(e, n, r) {
  let filtered = getAllowedEffortLevels(e).filter((f) => f !== "max" && modelSupportsEffortLevel(e, f));
  return r === 1
    ? filtered.find((f) => effortRank(f) > effortRank(n))
    : filtered.findLast((f) => effortRank(f) < effortRank(n));
}
/**
 * 当前之上只剩 max 且模型支持 max。应归 utils/effort.ts。
 */
//@ chunk-kswt4qha.js:21416-21494 layout = getRequestTooLargeErrorMessage (1)
function isOnlyMaxAboveEffort(e, n) {
  return (
    n !== "max" &&
    findAdjacentEffortLevel(e, n, 1) === void 0 &&
    isEffortWithinCap("max", e) &&
    modelSupportsMaxEffort(e)
  );
}
/**
 * 模型支持 effort、非受限会话且未被 CLAUDE_CODE_EFFORT_LEVEL 覆盖。
 */
//@ chunk-kswt4qha.js:21494-21544 layout
function isEffortAdjustable(e) {
  return modelSupportsEffort(e) && !wt() && getEffortEnvOverride() === void 0;
}
/**
 * isEffortAdjustable 且 GrowthBook tengu_velvety_kay（帮助菜单、提示中显示 effort 入口）。
 */
//@ chunk-kswt4qha.js:21544-21580 layout
function shouldShowEffortHint(e) {
  return isEffortAdjustable(e) && isEffortHintFlagOn();
}
/**
 * GrowthBook tengu_velvety_kay（默认关）。
 */
//@ chunk-kswt4qha.js:21580-21628 layout
function isEffortHintFlagOn() {
  return getFeatureValue_CACHED_MAY_BE_STALE("tengu_velvety_kay", !1);
}
/**
 * 模型本可支持高于上限的级别（/effort 提示受限）。
 */
//@ chunk-kswt4qha.js:21628-21706 layout
function hasEffortLevelsAboveCap(e) {
  let n = getEffortCap(e);
  return (
    n !== null && EFFORT_LEVELS.some((r) => effortRank(r) > effortRank(n) && modelSupportsEffortLevel(e, r))
  );
}
/**
 * 请求的 effort 超上限时的提示 "Effort 'x' exceeds the cap … using 'y'."。
 */
//@ chunk-kswt4qha.js:21706-21932 layout
function getEffortCapWarning(e, n) {
  if (typeof e !== "string" || !isEffortLevel(e)) return null;
  let r = getEffortCap(n);
  if (r === null || effortRank(e) <= effortRank(r)) return null;
  let s = resolveEffortValue(n, e) ?? r;
  return `Effort '${e}' exceeds the cap for ${n} set by your settings or organization; using '${s}'.`;
}
/**
 * 关键字别名 {ultracode: "xhigh"}。
 */
//@ chunk-kswt4qha.js:21932-21977 file-local
var EFFORT_LEVEL_ALIASES = { med: "medium" },
  EFFORT_KEYWORD_ALIASES = { ultracode: "xhigh" };
/**
 * 识别 effort 关键字（ultracode）。
 */
//@ chunk-kswt4qha.js:21977-22088 layout
function parseEffortKeyword(e) {
  if (typeof e !== "string") return;
  let lower = e.trim().toLowerCase();
  return Object.hasOwn(EFFORT_KEYWORD_ALIASES, lower) ? lower : void 0;
}
/**
 * 关键字 → 对应级别。
 */
//@ chunk-kswt4qha.js:22088-22148 layout
function resolveEffortKeyword(e) {
  let n = parseEffortKeyword(e);
  return n === void 0 ? void 0 : EFFORT_KEYWORD_ALIASES[n];
}
/**
 * String(effort)。
 */
//@ chunk-kswt4qha.js:22148-22180 layout
function effortValueToString(e) {
  return String(e);
}
/**
 * 字符串（含 med 别名）→ 合法级别，否则 undefined。
 */
//@ chunk-kswt4qha.js:22180-22257 layout
function parseEffortLevel(e) {
  let lower = e.trim().toLowerCase(),
    r = EFFORT_LEVEL_ALIASES[lower] ?? lower;
  return isEffortLevel(r) ? r : void 0;
}
/**
 * 解析 --effort：级别或关键字；未知值给出警告 "Unknown --effort value …"。
 */
//@ chunk-kswt4qha.js:22257-22530 layout
function parseEffortFlag(e) {
  let n = parseEffortLevel(e);
  if (n !== void 0) return { level: n, warning: void 0 };
  let r = parseEffortKeyword(e);
  if (r !== void 0) return { level: r, warning: void 0 };
  return {
    level: void 0,
    warning: `Unknown --effort value '${e}' \u2014 ignoring it and using the default effort. Valid values: ${EFFORT_LEVELS.join(", ")}.`,
  };
}
/**
 * 解析设置/参数里的 effort：整数或级别（含别名、数字字符串），空值为 undefined（旧版同名）。
 */
//@ chunk-kswt4qha.js:22530-22739 file-local
function parseEffortValue(value) {
  if (value === void 0 || value === null || value === "") return;
  if (typeof value === "number" && isIntegerEffort(value)) return value;
  let str = String(value).toLowerCase(),
    r = EFFORT_LEVEL_ALIASES[str] ?? str;
  if (isEffortLevel(r)) return r;
  let numericValue = parseInt(str, 10);
  if (!isNaN(numericValue) && isIntegerEffort(numericValue)) return numericValue;
  return;
}
/**
 * 可写入设置的 effort（low/medium/high/xhigh；max 只在会话内）。
 */
//@ chunk-kswt4qha.js:22739-22823 callgraph-fingerprint = toPersistableEffort (0.601)
function toPersistableEffort(value) {
  if (value === "low" || value === "medium" || value === "high" || value === "xhigh") return value;
  return;
}
/**
 * settings.ultracode 为 true 或 effort 参数为 ultracode（ultracode → xhigh 的别名）。
 */
//@ chunk-kswt4qha.js:22823-22888 layout
function isUltracodeEnabled(e) {
  return getInitialSettings_2().ultracode === !0 || parseEffortKeyword(e) === "ultracode";
}
/**
 * CLAUDE_CODE_SUBAGENT_EFFORT 解析后的子代理 effort。
 */
//@ chunk-kswt4qha.js:22888-22970 layout
function getSubagentEffortOverride() {
  let CLAUDE_CODE_SUBAGENT_EFFORT = env.CLAUDE_CODE_SUBAGENT_EFFORT;
  return CLAUDE_CODE_SUBAGENT_EFFORT === void 0 ? void 0 : parseEffortLevel(CLAUDE_CODE_SUBAGENT_EFFORT);
}
/**
 * CLAUDE_CODE_EFFORT_LEVEL：unset/auto 返回 null（强制不设），否则解析出的级别或数字；未设置为 undefined。
 */
//@ chunk-kswt4qha.js:22970-23089 fingerprint = getEffortEnvOverride (1)
function getEffortEnvOverride() {
  let envOverride = env.CLAUDE_CODE_EFFORT_LEVEL;
  return envOverride?.toLowerCase() === "unset" || envOverride?.toLowerCase() === "auto"
    ? null
    : parseEffortValue(envOverride);
}
/**
 * 模型选择常量 {kind:"inherit"} 与 {kind:"default"}。
 */
//@ chunk-kswt4qha.js:23089-23164 layout = resolveAgentModelDisplay (0.819)
var INHERIT_EFFORT_SETTING = Object.freeze({ kind: "inherit" }),
  DEFAULT_EFFORT_SETTING = Object.freeze({ kind: "default" });
/**
 * {kind:"level", value}。
 */
//@ chunk-kswt4qha.js:23164-23209 layout
function levelEffortSetting(e) {
  return { kind: "level", value: e };
}
/**
 * undefined → default，否则 level。
 */
//@ chunk-kswt4qha.js:23209-23253 layout
function toEffortSettingOrDefault(e) {
  return e === void 0 ? DEFAULT_EFFORT_SETTING : levelEffortSetting(e);
}
/**
 * undefined → inherit，否则 level。
 */
//@ chunk-kswt4qha.js:23253-23297 layout
function toEffortSettingOrInherit(e) {
  return e === void 0 ? INHERIT_EFFORT_SETTING : levelEffortSetting(e);
}
/**
 * 级别设置返回其字符串，否则 null。
 */
//@ chunk-kswt4qha.js:23297-23358 layout
function effortSettingToString(e) {
  return e.kind === "level" ? String(e.value) : null;
}
/**
 * 非空且不超过 128 字符的字符串，否则 null。
 */
//@ chunk-kswt4qha.js:23358-23431 layout
function toBoundedLabel(e) {
  return typeof e === "string" && e !== "" && e.length <= MAX_REQUEST_ID_LENGTH ? e : null;
}
/**
 * 两个会话 effort 设置是否相同。
 */
//@ chunk-kswt4qha.js:23431-23536 layout
function isSameEffortSetting(e, n) {
  return (
    e === n || (e.kind === n.kind && (e.kind !== "level" || (n.kind === "level" && e.value === n.value)))
  );
}
/**
 * isLegacyUserEffortModel 的结果缓存。
 */
//@ chunk-kswt4qha.js:23536-23919 layout
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
  ]),
  legacyUserEffortCache = new Map();
/**
 * 模型在旧式名单内或名字无法解析为版本化模型时，顶层用户 effortLevel 对其生效。
 */
//@ chunk-kswt4qha.js:23919-24010 layout
function isLegacyUserEffortModel(e) {
  let n = legacyUserEffortCache.get(e);
  if (n === void 0)
    ((n = LEGACY_USER_EFFORT_MODELS.has(e) || !wR(parseModelId(e))), legacyUserEffortCache.set(e, n));
  return n;
}
/**
 * 首次启动版本未记录时、尚未解除“发布期默认 effort 固定”的模型（opus-4-7、opus-4-8、fable-5 及 ANTHROPIC_DEFAULT_FABLE_MODEL）。
 */
//@ chunk-kswt4qha.js:24010-24367 layout
function getLaunchEffortPinnedModels() {
  let e = getGlobalConfig();
  if (e.firstStartVersion !== void 0) return [];
  let n = [];
  if (!e.unpinOpus47LaunchEffort) n.push("claude-opus-4-7");
  if (!e.unpinOpus48LaunchEffort) n.push("claude-opus-4-8");
  if (!e.unpinFable5LaunchEffort) {
    n.push("claude-fable-5");
    let ANTHROPIC_DEFAULT_FABLE_MODEL = env.ANTHROPIC_DEFAULT_FABLE_MODEL;
    if (
      ANTHROPIC_DEFAULT_FABLE_MODEL &&
      !e5e(
        getCanonicalName(parseUserSpecifiedModel(ANTHROPIC_DEFAULT_FABLE_MODEL), {
          deterministic: !0,
          identity: !0,
        }),
      )
    )
      n.push(getModelSettingsKey(ANTHROPIC_DEFAULT_FABLE_MODEL));
  }
  return n;
}
/**
 * 按优先级列出带设置的来源（flagSettings 展开为 project/local；去重同一文件）。
 */
//@ chunk-kswt4qha.js:24367-24738 layout
function getEffortSettingsSources() {
  let e = new Set(),
    n = [];
  for (let r of getEnabledSettingSources()) {
    if (r === "flagSettings") {
      let [d, u] = j();
      if (d !== void 0) n.push({ source: "projectSettings", settings: d });
      if (u !== void 0) n.push({ source: "localSettings", settings: u });
    }
    let s = getSettingsFilePathForSource(r);
    if (s !== void 0) {
      let d = resolve(s);
      if (e.has(d) && r !== "flagSettings") continue;
      e.add(d);
    }
    let f = getSettingsForSource(r);
    if (f !== void 0 && f !== null) n.push({ source: r, settings: f });
  }
  return n;
}
/**
 * 构建 effort 设置表：{default（非用户来源的顶层 effortLevel）, legacyUserEffort（用户设置顶层）, byModel（各来源 modelSettings.<模型>.effortLevel，按优先级取第一个）}；组织覆盖与发布期固定模型强制为 undefined。
 */
//@ chunk-kswt4qha.js:24738-25757 layout
function buildEffortSettingsTable() {
  let e = getEffortSettingsSources(),
    n = getOrgModelDefaultCache(),
    r = n !== null && orgOverridesUserEffort(n.name) ? getModelSettingsKey(n.name) : void 0,
    s,
    f,
    d = [];
  for (let { source: source, settings: settings } of e) {
    let y = settings.effortLevel !== void 0;
    if (source === "userSettings") {
      ((s = toPersistableEffort(settings.effortLevel)),
        d.push({ source: source, setsTopLevel: !1, settings: settings }));
      continue;
    }
    if (y) f = { level: toPersistableEffort(settings.effortLevel) };
    d.push({ source: source, setsTopLevel: y, settings: settings });
  }
  d.reverse();
  let mapped = d.map(({ settings: settings }) => {
      let h = new Map();
      for (let [y, x] of Object.entries(settings.modelSettings ?? {})) {
        let c = x?.effortLevel;
        if (c === void 0) continue;
        let _ = getModelSettingsKey(y);
        if (y === _ || !h.has(_)) h.set(_, c);
      }
      return h;
    }),
    E = new Set();
  if (r !== void 0) E.add(r);
  for (let S of mapped) for (let h of S.keys()) E.add(h);
  let m = {};
  for (let S of E) {
    if (S === r) m[S] = void 0;
    for (let h = 0; h < d.length; h++) {
      if (S === r && !isReadOnlySettingSource(d[h].source)) continue;
      let y = mapped[h].get(S);
      if (y !== void 0) {
        m[S] = toPersistableEffort(y);
        break;
      }
      if (d[h].setsTopLevel) {
        m[S] = toPersistableEffort(d[h].settings.effortLevel);
        break;
      }
    }
  }
  if (f !== void 0) s = void 0;
  if (s !== void 0) {
    for (let S of getLaunchEffortPinnedModels())
      if (!Object.hasOwn(m, S) && !Object.hasOwn(Object.prototype, S)) m[S] = void 0;
  }
  return { default: f?.level, legacyUserEffort: s, byModel: m };
}
/**
 * policySettings 或 flagSettings。旧版名错配。
 */
//@ chunk-kswt4qha.js:25757-25820 layout = getEnabledSettingSources (1)
function isReadOnlySettingSource(e) {
  return e === "policySettings" || e === "flagSettings";
}
/**
 * 组织强制 effort 时该模型的生效级别。
 */
//@ chunk-kswt4qha.js:25820-25898 layout
function getOrgOverriddenEffort(e) {
  if (!orgOverridesUserEffort(e)) return null;
  return normalizeEffortLevel(
    resolveAppliedEffort(
      lookupEffortSetting(buildEffortSettingsTable(), e) ?? getDefaultEffortForModel(e),
      e,
    ),
  );
}
/**
 * 从 effort 设置表取模型的 effort：byModel → default → 旧式用户设置（仅旧模型）。
 */
//@ chunk-kswt4qha.js:25898-26086 layout
function lookupEffortSetting(e, n) {
  let r = getModelSettingsKey(n);
  if (Object.hasOwn(e.byModel, r)) return e.byModel[r];
  if (e.default !== void 0 || e.legacyUserEffort === void 0) return e.default;
  return isLegacyUserEffortModel(r) ? e.legacyUserEffort : void 0;
}
/**
 * 设置表没有旧式用户值也没有按模型条目。
 */
//@ chunk-kswt4qha.js:26086-26182 layout
function isEffortSettingsTableEmpty(e) {
  if (e.legacyUserEffort !== void 0) return !1;
  for (let key in e.byModel) return !1;
  return !0;
}
/**
 * 模型在 settings.modelSettings 里的键（去 [1m]、确定性规范名）。
 */
//@ chunk-kswt4qha.js:26182-26250 layout
function getModelSettingsKey(e) {
  return Lt(getCanonicalName(resolveModelAliasSpelling(e), { deterministic: !0, identity: !0 }));
}
/**
 * 生成按模型保存 effort 的设置补丁 {modelSettings:{<模型键>:{effortLevel}}}。
 */
//@ chunk-kswt4qha.js:26250-26313 fingerprint = getInitialEffortSetting (1)
function getInitialEffortSetting(e, n) {
  return buildModelSettingsPatch(e, { effortLevel: n }, { effortLevel: n });
}
/**
 * 模型键是 Object.prototype 上的名字时用回退补丁，防原型污染。
 */
//@ chunk-kswt4qha.js:26313-26412 layout
function buildModelSettingsPatch(e, n, r) {
  let s = getModelSettingsKey(e);
  return Object.hasOwn(Object.prototype, s) ? r : { modelSettings: { [s]: n } };
}
//@ chunk-kswt4qha.js:26412-26483 placement
function whi(e) {
  let n = getOauthAccountInfo()?.accountUuid;
  return n !== void 0 && q(getGlobalConfig(), n, e);
}
/**
 * 取当前会话生效的推理强度：会话显式等级直接返回，default 返回 undefined；inherit 时按设置里的按模型强度表查当前主循环模型（withHold 时若模型自带强度则不覆盖）。
 */
//@ chunk-kswt4qha.js:26483-26864 placement = _temp8 (0.203)
function resolveEffortLevel(e, n, { withHold: r = !0 } = {}) {
  let s = e.sessionEffort ?? INHERIT_EFFORT_SETTING;
  switch (s.kind) {
    case "level":
      return s.value;
    case "default":
      return;
    case "inherit": {
      if (e.settingsEffortTable === void 0) return;
      if (isEffortSettingsTableEmpty(e.settingsEffortTable) && !re()) return e.settingsEffortTable.default;
      let f =
        n ??
        parseUserSpecifiedModel(e.mainLoopModelForSession ?? e.mainLoopModel ?? getDefaultMainLoopModel());
      return r && carriedEffortOnly(f) !== void 0 ? void 0 : lookupEffortSetting(e.settingsEffortTable, f);
    }
  }
}
//@ chunk-kswt4qha.js:26864-26903 placement
function pcr(e, n) {
  return getModelSettingsKey(e) === getModelSettingsKey(n);
}
//@ chunk-kswt4qha.js:26903-26955 placement
function Ehi(e, n) {
  return resolveEffortLevel(QZo(e), n, { withHold: !1 });
}
//@ chunk-kswt4qha.js:26955-27037 placement
function QZo(e) {
  return e.sessionEffort?.kind === "level" ? { ...e, sessionEffort: INHERIT_EFFORT_SETTING } : e;
}
/**
 * 取 effort 级别值。
 */
//@ chunk-kswt4qha.js:27037-27119 placement
function effortLevelValue(e) {
  return e.kind === "level" && typeof e.value === "string" ? e.value : void 0;
}
/**
 * 本次请求的 effort（output_config.effort 的来源）：模型不支持 → undefined；钩子值 > CLAUDE_CODE_EFFORT_LEVEL（unset/auto → 不发）> 本轮 effort > 会话设置 > 默认（getDefaultEffortForModel）；最后经 resolveAppliedEffort 夹取。
 */
//@ chunk-kswt4qha.js:27119-27430 layout
function resolveEffortValue(
  e,
  n,
  { turnEffort: r, hookEffortValue: s, carriedEffort: f = getCarriedRefusalEffort(e) } = {},
) {
  if (!modelSupportsEffort(e)) return;
  let d = getSettingsMaxEffort(e) !== null;
  if (s !== void 0) {
    let S = typeof s === "number" && d ? normalizeEffortLevel(s) : s;
    return resolveAppliedEffort(S, e);
  }
  let u = getEffortEnvOverride();
  if (u === null && !d) return;
  let E = getDefaultEffortForModel(e, f),
    m = u ?? (u === null ? E : void 0) ?? r ?? n ?? E;
  if (typeof m === "number" && d) m = normalizeEffortLevel(m);
  return resolveAppliedEffort(m, e);
}
/**
 * 模型支持 effort 且无环境覆盖时：给定字符串按组织上限截断；未给且组织默认 effort 存在时用模型默认 effort。
 */
//@ chunk-kswt4qha.js:27430-27562 layout
function getModelPickerEffortDefault(e, n) {
  if (!modelSupportsEffort(e) || getEffortEnvOverride() !== void 0) return;
  if (typeof n === "string") return clampEffortToCap(n, e);
  if (n === void 0 && getOrgDefaultEffort(e)) return getDefaultEffortLevel(e);
  return;
}
/**
 * 把请求的 effort 落到模型能接受的值：先按组织上限截断，max/xhigh 不支持时降为 high。
 */
//@ chunk-kswt4qha.js:27562-27702 fingerprint = resolveAppliedEffort (0.778)
function resolveAppliedEffort(model, appStateEffortValue) {
  let r = model;
  if (typeof r === "string" && isEffortLevel(r)) r = clampEffortToCap(r, appStateEffortValue);
  if (r === "max" && !modelSupportsMaxEffort(appStateEffortValue)) r = "high";
  if (r === "xhigh" && !modelSupportsXhighEffort(appStateEffortValue)) r = "high";
  return r;
}
/**
 * 模型默认 effort（规范为级别）。
 */
//@ chunk-kswt4qha.js:27702-27743 layout
function getDefaultEffortLevel(e) {
  return normalizeEffortLevel(resolveAppliedEffort(getDefaultEffortForModel(e), e));
}
/**
 * 模型支持每轮 effort 控制（per-turn-control beta）且会话未关闭它。
 */
//@ chunk-kswt4qha.js:27743-27779 layout
function modelSupportsPerTurnEffortControl(e) {
  return Vpr(e, getCanonicalName(e));
}
/**
 * ultrathink 可用（tengu_turtle_carbon 等）、模型可调 effort 且把本轮 effort 设为 xhigh 能生效。
 */
//@ chunk-kswt4qha.js:27779-27914 layout
function isUltrathinkEffective(e, n) {
  return (
    isUltrathinkEnabled() &&
    (!getIsNonInteractiveSession() || (isVsCodeOrDesktop() && isVirtualPancakeEnabled())) &&
    isEffortAdjustable(e) &&
    modelSupportsPerTurnEffortControl(e) &&
    typeof resolveEffortValue(e, n) === "string" &&
    resolveEffortValue(e, n, { turnEffort: "xhigh" }) === "xhigh"
  );
}
/**
 * ultrathink 有效且当前 effort 低于 xhigh。
 */
//@ chunk-kswt4qha.js:27914-27971 layout
function shouldUltrathinkRaiseEffort(e, n) {
  return isUltrathinkEffective(e, n) && effortRank(getEffortLevelOrHigh(e, n)) < effortRank("xhigh");
}
/**
 * 会话中途 effort 实际值发生变化（已有输出、模型支持、非受限）时为真，用于提示 effort 变更。
 */
//@ chunk-kswt4qha.js:27971-28273 layout
function shouldShowEffortChangeNotice(e, n, r, s, f) {
  if (!f) return !1;
  let d = getTotalOutputTokens();
  if (d === 0 || d === s) return !1;
  if (!modelSupportsEffort(r)) return !1;
  if (
    typeof resolveEffortValue(r, e) !== "number" &&
    typeof resolveEffortValue(r, n) !== "number" &&
    modelSupportsPerTurnEffortControl(r)
  )
    return !1;
  if (resolveEffortValue(r, e, { carriedEffort: null }) === resolveEffortValue(r, n)) return !1;
  if (
    ml() &&
    e !== void 0 &&
    toPersistableEffort(typeof e === "string" ? clampEffortToCap(e, r) : e) === void 0
  )
    return !1;
  return !0;
}
/**
 * 写 userSettings 的 effortLevel。
 */
//@ chunk-kswt4qha.js:28273-28341 layout = _temp5 (1)
async function saveEffortToUserSettings(e, n, r) {
  return updateSettingsForSource("userSettings", getInitialEffortSetting(n, e), void 0, r);
}
/**
 * 需要持久化且级别可保存时写用户设置，返回错误（如有）。
 */
//@ chunk-kswt4qha.js:28341-28497 layout
async function persistEffortSetting(e, n, r = !0, s) {
  let f = e !== void 0 ? toPersistableEffort(e) : void 0;
  if (r && (e === void 0 || f !== void 0) && !Jn()) {
    let d = await saveEffortToUserSettings(f, n, s);
    if (d.error) return d.error;
  }
  return;
}
/**
 * 初始会话 effort 状态 {sessionEffort, settingsEffortTable}。
 */
//@ chunk-kswt4qha.js:28497-28588 layout
function createSessionEffortState(e) {
  let n = {
    sessionEffort: toEffortSettingOrInherit(oQr(e)),
    settingsEffortTable: buildEffortSettingsTable(),
  };
  return (setMainLoopEffortState(n), n);
}
/**
 * resolveEffortValue 的级别形式。
 */
//@ chunk-kswt4qha.js:28588-28668 layout
function getAppliedEffortLevel(e, n, r) {
  let s = resolveEffortValue(e, n, { turnEffort: r });
  return s === void 0 ? void 0 : normalizeEffortLevel(s);
}
/**
 * 生效的 effort 级别，未设置时视为 high。
 */
//@ chunk-kswt4qha.js:28668-28713 layout = getDefaultEffortLevelForOption (1)
function getEffortLevelOrHigh(e, n, r) {
  return getAppliedEffortLevel(e, n, r) ?? "high";
}
/**
 * 模型支持 effort 时返回生效级别（默认 high），否则 undefined。
 */
//@ chunk-kswt4qha.js:28713-28762 layout
function getEffortLevelIfSupported(e, n, r) {
  return modelSupportsEffort(e) ? getEffortLevelOrHigh(e, n, r) : void 0;
}
/**
 * 显示用后缀 " with <level> effort"。
 */
//@ chunk-kswt4qha.js:28762-28908 fingerprint = getEffortSuffix (0.86)
function getEffortSuffix(e, n, r, s) {
  if (n === void 0 && r === void 0) return "";
  let f = s ?? resolveEffortValue(e, n, { turnEffort: r });
  if (f === void 0) return "";
  return ` with ${effortValueToString(normalizeEffortLevel(f))} effort`;
}
/**
 * 数值 effort（旧版 isValidNumericEffort）。
 */
//@ chunk-kswt4qha.js:28908-28950 layout
function isIntegerEffort(e) {
  return Number.isInteger(e);
}
/**
 * 数值或非法值统一当作 high，合法级别原样返回。
 */
//@ chunk-kswt4qha.js:28950-29023 layout = getDefaultEffortLevelForOption (1)
function normalizeEffortLevel(value) {
  if (typeof value === "string") return isEffortLevel(value) ? value : "high";
  return "high";
}
/**
 * effort 级别的说明文字（/effort 与选择器用）。
 */
//@ chunk-kswt4qha.js:29023-29452 fingerprint = getEffortLevelDescription (0.802)
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
/**
 * effort 值说明；high 在 Pro 订阅且 tengu_slate_finch 时提示“消耗最快”。
 */
//@ chunk-kswt4qha.js:29452-29693 callgraph-witnessed = getEffortValueDescription (0.328)
function getEffortValueDescription(value) {
  if (typeof value === "string") {
    let n = getEffortLevelDescription_2(value);
    if (value === "high" && isProSubscriber() && getFeatureValue_CACHED_MAY_BE_STALE("tengu_slate_finch", !1))
      return `${n} \xB7 burns fastest \u2014 medium handles most tasks`;
    return n;
  }
  return "Balanced approach with standard implementation and testing";
}
/**
 * 模型默认 effort：GrowthBook tengu_witty_wand 按模型配置 > 组织默认 > fallback 携带的 effort > 服务端目录 > 配置 default_effort > catalog default_effort（缺省 high）。
 */
//@ chunk-kswt4qha.js:29693-29782 layout
function getDefaultEffortForModel(e, n) {
  let r = remoteDefaultEffort(e);
  return (
    (r === void 0 ? n : void 0) ??
    getOrgDefaultEffort(e) ??
    r ??
    ze(e) ??
    getConfiguredDefaultEffort(e) ??
    getDisplayedEffortLevel(e)
  );
}
/**
 * 配置里该模型的 default_effort（模型需支持该级别）。
 */
//@ chunk-kswt4qha.js:29782-29876 layout
function getConfiguredDefaultEffort(e) {
  let n = getCachedClientData(e)?.default_effort;
  return typeof n === "string" && isEffortLevel(n) && modelSupportsEffortLevel(e, n) ? n : void 0;
}
/**
 * 只有沿用的 effort 时返回它。
 */
//@ chunk-kswt4qha.js:29876-29945 placement
function carriedEffortOnly(e) {
  let n = getCarriedRefusalEffort(e);
  return n !== void 0 && remoteDefaultEffort(e) === void 0 ? n : void 0;
}
//@ chunk-kswt4qha.js:29945-30012 placement
function khi(e) {
  return (
    getOrgDefaultEffort(e) !== null ||
    remoteDefaultEffort(e) !== void 0 ||
    getCarriedRefusalEffort(e) !== void 0
  );
}
//@ chunk-kswt4qha.js:30012-30061 placement
var TENGU_WITTY_WAND = "tengu_witty_wand",
  Je = DoctorLazy(() => pe(o(), oe()));
//@ chunk-kswt4qha.js:30061-30279 placement
function remoteDefaultEffort(e) {
  let n = getFeatureValue_CACHED_MAY_BE_STALE(TENGU_WITTY_WAND, {});
  if (typeof n === "string") n = safeParseJSON(n, !1);
  let safeParse = Je().safeParse(n);
  if (!safeParse.success) return;
  let s = safeParse.data[Lt(getCanonicalName(e))],
    f = typeof s === "string" ? s.trim().toLowerCase() : void 0;
  return f !== void 0 && isEffortLevel(f) ? f : void 0;
}
//@ chunk-kswt4qha.js:30279-30347 placement
function ze(e) {
  let n = twi(e, getCanonicalName(e));
  return n !== void 0 && isEffortLevel(n) ? n : void 0;
}
//@ chunk-kswt4qha.js:30347-30403 placement
function getDisplayedEffortLevel(e) {
  return getCatalogEntry(getCanonicalName(e))?.default_effort ?? "high";
}
//@ chunk-kswt4qha.js:30403-30502 placement
function hcr(e, n) {
  let r = Jn() ? void 0 : getEffortEnvOverride();
  return (r === null || (r === void 0 && e === void 0)) && carriedEffortOnly(n) === void 0;
}
//@ chunk-kswt4qha.js:30502-30527 placement
function eTn(e, n) {
  return;
}
/**
 * 模型选择器某选项的 effort 能力：是否支持 effort/max/xhigh、可选级别（受组织上限）与默认 effort。旧版名 convertEffortValueToLevel 为错配。
 */
//@ chunk-18hwfzwa.js:675600-675889 callgraph-fingerprint = convertEffortValueToLevel (0.529)
function getEffortCapabilitiesForOption(value) {
  let x = Ow(value),
    D = Hme(value);
  if (!x)
    return {
      supportsEffort: !1,
      supportsMax: !1,
      supportsXHigh: !1,
      capLevels: ["low", "medium", "high"],
      defaultEffort: D,
    };
  return {
    supportsEffort: modelSupportsEffort(x),
    supportsMax: modelSupportsMaxEffort(x) && isEffortWithinCap("max", x),
    supportsXHigh: modelSupportsXhighEffort(x) && isEffortWithinCap("xhigh", x),
    capLevels: getAllowedEffortLevels(x),
    defaultEffort: clampEffortToCap(D, x),
  };
}
/**
 * 某推理强度相对默认强度的成本比。
 */
//@ chunk-18hwfzwa.js:1101574-1101734 placement
function effortCostRatio(h, x) {
  if (!modelSupportsEffort(h)) return null;
  let D = getCatalogEntry(getCanonicalName(h))?.effort_cost_index;
  if (!D) return null;
  let L = D[x],
    ee = D[getDefaultEffortLevel(h)];
  if (L === void 0 || !ee) return null;
  return L / ee;
}
//@ chunk-kcvmr83c.js:1382-1457 placement = getEffortEnvOverride (0.817)
function getEffortEnvOverride_2(e) {
  let lower = e.toLowerCase();
  return lower === "auto" || lower === "unset" || isReservedEffortKeyword(lower);
}
//@ chunk-kcvmr83c.js:1457-1538 placement
function parseEffortArg(e) {
  if (getEffortEnvOverride_2(e)) return { value: void 0 };
  let t = parseEffortLevel(e);
  return t ? { value: t } : null;
}
/**
 * effort 级别说明：模型有特定说明时用之，max 级用"May use excessive tokens..."提示。旧版名 getRequestTooLargeErrorMessage 为错配；应归 utils/effort.ts。
 */
//@ chunk-3rwvzn82.js:29349-29425 placement = getRequestTooLargeErrorMessage (1)
function getEffortLevelDescription(u, l) {
  if (eo(u)) return describeEffortLevel(u, l.value);
  return l.value === "max" ? MAX_EFFORT_DESCRIPTION : "";
}
/**
 * effort 级别从低到高：low、medium、high、xhigh、max。
 */
//@ chunk-dcmhvw5a.js:189583-189628 callgraph-witnessed = EFFORT_LEVELS (0.879)
var EFFORT_LEVELS = ["low", "medium", "high", "xhigh", "max"];

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
  persistEffortSetting,
  levelEffortSetting,
  toBoundedLabel,
  isUltracodeAvailable,
  shouldShowEffortHint,
  shouldShowEffortChangeNotice,
  effortValueToString,
  isOnlyMaxAboveEffort,
  toPersistableEffort,
  effortCostRatio,
  eTn,
  getModelPickerEffortDefault,
  isEffortHintFlagOn,
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
  hcr,
  getEffortLevelDescription,
  getAllowedEffortLevels,
  getEffortValueDescription,
  carriedEffortOnly,
  getEffortEnvOverride_2,
  toEffortSettingOrDefault,
  isSameEffortSetting,
  getDefaultEffortForModel,
  khi,
  resolveEffortKeyword,
  effortSettingToString,
  isRequestedEffortTheHeldLevel,
  parseEffortKeyword,
  isEffortChangedFromSession,
  lookupEffortSetting,
  pcr,
  Ehi,
  modelCapsEffortWhenThinkingDisabled,
  getSubagentEffortOverride,
  QZo,
  whi,
  buildModelSettingsPatch,
};
