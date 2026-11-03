/**
 * utils/model/planModeModel.ts
 *
 * 2.1.316 新增：强制的默认模型列表；计划模式模型设置与来源等。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-aepeg2w5.js (27)
 * attribution: placement 27
 */
import { env } from "../env.js";
import { nI } from "./bedrock.js";
import {
  strip1mTagWhereBuiltIn,
  Bi,
  getDefaultOpusModel,
  getDefaultSonnetModel,
  isTierDefaultModelEnv,
  Fu,
} from "./model.js";
import { getModelStrings, reverseModelOverride, resolveProviderModelId } from "./modelStrings.js";
import { ju, getModelUnavailabilityReason } from "./classifierModel.js";
import { Lt, I_, Nb, Sv } from "./modelIds.js";
import {
  usesFirstPartyModelIds,
  getAPIProvider,
  getRowFamily,
  getProviderAliasTargets,
  providerCatalogKey,
  hi,
} from "./providers.js";
import {
  getModelEntitlementDenySet,
  hasManagedModelDenies,
  newestAllowedInFamily,
  isModelAllowed,
  isModelDenied,
  getOrgModelDefault,
} from "./modelAllowlist.js";
import { getSettings_DEPRECATED } from "../settings/settings.js";
import {
  isModelAllowedUnderActiveEnforcement,
  eligible1mSuffixTarget,
  At,
  resolveAvailableModels,
  familyDefaultFor,
  getEnvDefaultModel,
  envDefaultModel,
  ZK,
} from "./defaultModel.js";
import {
  shouldProbeThirdPartyDefaults,
  shouldProbeThirdPartyDefaultsAlt,
} from "./thirdPartyModelDefaults.js";
import {
  opus1mMergeAddsTagTo,
  isOpus1mMergeEnabled,
  parseUserSpecifiedModel,
  getCuratedModelPicker,
  applyOpus1mOptIn,
} from "./modelDisplay.js";
import { logForDebugging } from "../debug.js";
import { getUserSpecifiedModelSetting, getAdminSteering } from "./smallFastModel.js";
import { isRecognizedModel } from "./canonicalModelName.js";
import { getAdditionalModelOptionsCache, isClaudeAISubscriber } from "../auth.js";
import { getGatewayModelOptions } from "../../services/gateway/gatewayDiscovery.js";
import { Wat, wi, fn, catalogSupportsPlanMode } from "./modelCatalog/catalogCapabilities.js";
import {
  Vte,
  isPublishedCatalogInUse,
  orgDefaultModelState,
  Yte,
  findServedModel,
  activeServedCatalog,
} from "./modelCatalog/servedCatalog.js";
import {
  getResolvedOrgDefault,
  setResolvedOrgDefault,
  getProbeRefutedDocumentDefaults,
} from "../../bootstrap/state.js";
import { getToolSearchBetaHeader } from "../betas.js";
import { olt } from "./contextWindow1m.js";
import { MODEL_KEY_BY_FIRST_PARTY_ID } from "./configs.js";
import { getUltraplanModel } from "../../commands/ultraplan.js";

//@ chunk-aepeg2w5.js:438266-438374 placement = isExcludedModel (0.763)
function getDefaultHaikuModel() {
  let ANTHROPIC_DEFAULT_HAIKU_MODEL = env.ANTHROPIC_DEFAULT_HAIKU_MODEL;
  if (ANTHROPIC_DEFAULT_HAIKU_MODEL !== void 0)
    return nI(strip1mTagWhereBuiltIn(ANTHROPIC_DEFAULT_HAIKU_MODEL));
  return Bi("haiku") ?? zp();
}
//@ chunk-aepeg2w5.js:438374-438426 placement
function zp(e = getModelStrings()) {
  return ju("haiku", e) ?? e.haiku45;
}
//@ chunk-aepeg2w5.js:438426-438476 placement
function isModeDependentModelSetting(e) {
  return e === "opusplan" || e === "haiku";
}
//@ chunk-aepeg2w5.js:438476-438585 placement
function planModeConstituentFamily(e) {
  if (e === "opusplan" || e === "opusplan[1m]") return "opus";
  if (e === "haiku") return "sonnet";
  return null;
}
//@ chunk-aepeg2w5.js:438585-438610 placement
function isOpusFableAdvisorSetting(e) {
  return !1;
}
//@ chunk-aepeg2w5.js:438610-438923 placement
function stepDownRestrictedFamilyAliasPick(e) {
  let lower = e.trim().toLowerCase(),
    trimmed = Lt(lower).trim();
  if (!I_(trimmed) || !usesFirstPartyModelIds()) return null;
  let s = getModelEntitlementDenySet();
  if (!(getSettings_DEPRECATED() || {}).availableModels && s.size === 0 && !hasManagedModelDenies())
    return null;
  let h = newestAllowedInFamily(trimmed);
  if (h === null || !(isModelAllowedUnderActiveEnforcement(h) ?? isModelAllowed(h)) || isModelDenied(h, s))
    return null;
  if (trimmed === lower) return h;
  return (trimmed === "opus"
    ? shouldProbeThirdPartyDefaults()
    : trimmed === "sonnet"
      ? shouldProbeThirdPartyDefaultsAlt()
      : !0) && eligible1mSuffixTarget(h)
    ? strip1mTagWhereBuiltIn(`${h}[1m]`)
    : h;
}
//@ chunk-aepeg2w5.js:438923-439285 placement
function planModeConstituentModel(e) {
  let n = planModeConstituentFamily(e);
  if (n === null || e === void 0 || e === null) return null;
  let r = e === "opusplan[1m]",
    s;
  if (n === "opus") {
    let S = getDefaultOpusModel();
    s = r || opus1mMergeAddsTagTo(S) ? strip1mTagWhereBuiltIn(append1mSuffixIfMissing(S)) : S;
  } else s = getDefaultSonnetModel();
  if (
    (isModelAllowedUnderActiveEnforcement(s) ?? isModelAllowed(s)) &&
    !isModelDenied(s, getModelEntitlementDenySet())
  )
    return { model: s, clamp: "none" };
  let y = stepDownRestrictedFamilyAliasPick(
    n === "opus" ? (r || isOpus1mMergeEnabled() ? "opus[1m]" : "opus") : "sonnet",
  );
  if (y !== null) return { model: y, clamp: "stepDown" };
  return { model: parseUserSpecifiedModel(e), clamp: "resting" };
}
//@ chunk-aepeg2w5.js:439285-439402 placement
function getRuntimeMainLoopModel(e) {
  let { model: model, clampWarning: clampWarning } = resolveRuntimeMainLoopModel(e);
  if (clampWarning !== null && !At().has(clampWarning))
    (At().add(clampWarning), logForDebugging(clampWarning, { level: "warn" }));
  return model;
}
//@ chunk-aepeg2w5.js:439402-440260 placement
function resolveRuntimeMainLoopModel(e) {
  let {
    permissionMode: permissionMode,
    mainLoopModel: mainLoopModel,
    exceeds200kTokens: exceeds200kTokens = !1,
  } = e;
  if (permissionMode !== "plan") return { model: mainLoopModel, clampWarning: null };
  let h = e.setting === void 0 ? getUserSpecifiedModelSetting() : e.setting,
    y = planModeConstituentFamily(h);
  if (y === null || (y === "opus" && exceeds200kTokens)) return { model: mainLoopModel, clampWarning: null };
  let S = planModeConstituentModel(h);
  if (S === null) return { model: mainLoopModel, clampWarning: null };
  if (S.clamp === "none") return { model: S.model, clampWarning: null };
  let w = y === "opus" ? "opusplan upgrade" : "haiku plan upgrade",
    R =
      S.clamp === "stepDown"
        ? `Plan mode: the ${w} model is not permitted by the org model restrictions (availableModels, deniedModels or model_access entitlement); planning uses the newest permitted ${y === "opus" ? "Opus" : "Sonnet"} instead`
        : `Plan mode: the ${w} model is not permitted by the org model restrictions (availableModels, deniedModels or model_access entitlement); planning uses the resting model instead`;
  return { model: S.model, clampWarning: R };
}
/**
 * 去掉结尾所有 [1m] 再加一个 [1m]。旧版名 resolveSkillModelOverride_3 为错配。
 */
//@ chunk-aepeg2w5.js:440260-440317 placement = resolveSkillModelOverride (1)
function append1mSuffixIfMissing(e) {
  return e.replace(/(\[1m\])+$/i, "") + "[1m]";
}
//@ chunk-aepeg2w5.js:440317-440564 placement
function getResolvedOrgDefaultModel() {
  let e = getOrgModelDefault();
  if (!e) return null;
  if (!isRecognizedOrgDefaultName(e.name)) {
    let n = `Org default model "${e.name}" is not one this build recognizes; using the standard default instead`;
    if (!At().has(n)) (At().add(n), logForDebugging(n, { level: "warn" }));
    return null;
  }
  return Nw(e.name);
}
//@ chunk-aepeg2w5.js:440564-440726 placement
function getBootstrapOrgDefaultEffect() {
  let e = getOrgModelDefault();
  if (!e) return null;
  if (isRecognizedOrgDefaultName(e.name)) {
    let n = getResolvedOrgDefaultModel();
    return n === null ? null : { model: n, kind: "org" };
  }
  return { model: resolvePlanModeModel(null).setting, kind: "standard" };
}
//@ chunk-aepeg2w5.js:440726-440785 placement
function isRecognizedOrgDefaultName(e) {
  return Nb(e.toLowerCase()) || isRecognizedModel(e) || isDeploymentVouchedModel(e);
}
//@ chunk-aepeg2w5.js:440785-441086 placement
function isDeploymentVouchedModel(e) {
  return (
    (env.ANTHROPIC_CUSTOM_MODEL_OPTION !== void 0 && Sv(env.ANTHROPIC_CUSTOM_MODEL_OPTION, e)) ||
    isTierDefaultModelEnv(e) ||
    reverseModelOverride(e) !== e ||
    getAdditionalModelOptionsCache().some((n) => typeof n.value === "string" && Sv(n.value, e)) ||
    getGatewayModelOptions().some((n) => typeof n.value === "string" && Sv(n.value, e)) ||
    (getCuratedModelPicker()?.picker.options.some((n) => Sv(n.model.trim(), e)) ?? !1)
  );
}
//@ chunk-aepeg2w5.js:441086-441154 placement
function lr(e) {
  return Wat() && getModelUnavailabilityReason(e, { ignoreModelOverrides: !0 }) !== null;
}
//@ chunk-aepeg2w5.js:441154-441220 placement
function Nw(e) {
  let n = resolveAvailableModels(e, null) ?? e,
    r = familyDefaultFor(n) ?? n;
  return lr(r) ? null : r;
}
/**
 * 返回 tne() 中的 setting 字段（被 fastMode 等多处使用）；旧版名 renderToolUseMessage 为误配。
 */
//@ chunk-aepeg2w5.js:441220-441255 placement = renderToolUseMessage (1)
function getDefaultMainLoopModelSetting() {
  return resolveDefaultMainLoopModelSetting().setting;
}
//@ chunk-aepeg2w5.js:441255-441497 placement
function defaultModelAttributionSuffix(e) {
  switch (e) {
    case "org":
      return " \xB7 Org default";
    case "enforced":
    case "entitlement":
    case "managed_deny":
      return " \xB7 Set by your organization";
    case "env":
      return " \xB7 Set by ANTHROPIC_DEFAULT_MODEL";
    case "served":
    case "tier":
      return "";
  }
}
//@ chunk-aepeg2w5.js:441497-441778 placement
function resolveDefaultMainLoopModelSetting() {
  let e = enforcedDefaultModels();
  if (e !== null && e.enforced) return { setting: e.setting, attribution: e.attribution };
  let n = Vte(),
    r = getResolvedOrgDefault(),
    s;
  if (n) s = null;
  else if (r === void 0) {
    if (((s = getResolvedOrgDefaultModel()), s !== null)) setResolvedOrgDefault(s);
  } else if (r === null) s = null;
  else s = Nw(r);
  if (s !== null) return { setting: s, attribution: "org" };
  return resolvePlanModeModel(e);
}
/**
 * 计划模式模型设置与来源。
 */
//@ chunk-aepeg2w5.js:441778-442245 placement
function resolvePlanModeModel(e) {
  let n = getEnvDefaultModel();
  if (n !== null) return { setting: n, attribution: "env" };
  let { setting: setting, envFamily: envFamily, concreteBaseline: concreteBaseline } = envDefaultModel(),
    y = isPublishedCatalogInUse(),
    S = e !== null && !Kw(envFamily) && !getToolSearchBetaHeader(envFamily) && !(y && isClaudeAISubscriber());
  if (S && !y) return { setting: e.setting, attribution: e.attribution };
  let w = S ? e.setting : setting,
    R = resolveAvailableModels(w, envFamily, concreteBaseline),
    x = R ?? w,
    P = familyDefaultFor(x);
  if (R !== null) return { setting: P ?? R, attribution: "enforced" };
  if (P !== null) return { setting: P, attribution: ZK(x) ? "managed_deny" : "entitlement" };
  return { setting: x, attribution: S ? e.attribution : "tier" };
}
/**
 * 强制的默认模型列表。
 */
//@ chunk-aepeg2w5.js:442245-442810 placement
function enforcedDefaultModels() {
  let e = orgDefaultModelState(),
    n = getAPIProvider() !== "firstParty" ? (Wat() ? wi("default") : {}) : null,
    r =
      n !== null
        ? [n.perProvider, n.everywhere]
        : e?.enforced === !0
          ? [e.model]
          : e?.accountResolved === !0
            ? [e.model, ...getDefaultModelOverrides(e.model)]
            : [...getDefaultModelOverrides(e?.model), e?.model],
    s = n !== null ? getProbeRefutedDocumentDefaults() : null,
    h = new Set();
  for (let y of r) {
    if (y === void 0 || h.has(y)) continue;
    if ((h.add(y), s?.has(y))) continue;
    let S = catalogModelWarning(y);
    if (S !== void 0) {
      let w = y === e?.model,
        R = isPublishedCatalogInUse() && !olt(S) ? Yte(S) : void 0,
        x = R === void 0 ? S : getModelStrings()[R];
      return {
        setting: R?.startsWith("opus") ? applyOpus1mOptIn(x) : x,
        attribution: w && e?.orgConfigured ? "org" : "served",
        enforced: w && e?.enforced === !0,
      };
    }
  }
  return null;
}
//@ chunk-aepeg2w5.js:442810-443013 placement
function getDefaultModelOverrides(e) {
  let n = wi("default"),
    r = e === void 0 ? void 0 : findServedModel(e),
    s = r === void 0 ? void 0 : getRowFamily(r),
    h = s === "opus" || s === "sonnet" || s === "haiku" || s === "fable" ? wi(s).perProvider : void 0;
  return [n.perProvider, h, n.everywhere];
}
//@ chunk-aepeg2w5.js:443013-443433 placement
function cloudDocumentDefaultCandidates() {
  if (getAPIProvider() === "firstParty" || !Wat()) return [];
  let { perProvider: perProvider, everywhere: everywhere } = wi("default"),
    r = [],
    s = new Set();
  for (let h of [perProvider, everywhere]) {
    if (h === void 0 || s.has(h)) continue;
    s.add(h);
    let y = catalogModelWarning(h);
    if (y === void 0) continue;
    let lower = h.toLowerCase(),
      w = findServedModel(h),
      R = Object.hasOwn(MODEL_KEY_BY_FIRST_PARTY_ID, lower)
        ? MODEL_KEY_BY_FIRST_PARTY_ID[lower]
        : Yte(w?.id ?? h);
    r.push({
      candidate: h,
      model: y,
      key: R,
      ...(w !== void 0 && R === void 0 && fn(w.id) && { overrideKey: w.id }),
      family: getRowFamily(w ?? { id: h }),
      name: Fu(h, R),
    });
  }
  return r;
}
//@ chunk-aepeg2w5.js:443433-443639 placement
function documentNamesCloudDefault() {
  let e = activeServedCatalog();
  if (e === null || getAPIProvider() === "firstParty" || !Wat()) return !1;
  if (getEnvDefaultModel() !== null || Kw(envDefaultModel().envFamily)) return !1;
  let n = getProviderAliasTargets(e, "default", providerCatalogKey(getAPIProvider()));
  return n.perProvider !== void 0 || n.everywhere !== void 0;
}
/**
 * 目录模型的警告（未发布、提供商不支持）。
 */
//@ chunk-aepeg2w5.js:443639-444068 placement
function catalogModelWarning(e) {
  if (Nb(Lt(e.trim().toLowerCase()).trim())) return;
  let n = findServedModel(e),
    r = resolveProviderModelId({ id: e, provider_ids: n?.provider_ids });
  if (r === void 0) return;
  let s = n === void 0 ? void 0 : getRowFamily(n);
  if (n !== void 0 && (hi(s) || s === "fable") && Yte(n.id) === void 0 && getUltraplanModel(s, n.id)) return;
  let h = new Set([e, parseUserSpecifiedModel(e)]);
  for (let S of h) if (!catalogSupportsPlanMode(S)) return;
  let y = r === e ? h : new Set([r]);
  for (let S of y)
    if (!isModelAllowed(S, { ignoreModelOverrides: !0, envFreeAliasResolution: !0 }) || lr(S)) return;
  return r;
}
//@ chunk-aepeg2w5.js:444068-444215 placement
function getOrgLockedDefaultModel() {
  if (Vte()) {
    let e = enforcedDefaultModels();
    return e !== null && e.enforced ? { model: e.setting, kind: "org" } : null;
  }
  return getOrgModelDefault()?.override_user_selection ? getBootstrapOrgDefaultEffect() : null;
}
//@ chunk-aepeg2w5.js:444215-444296 placement
function Kw(e) {
  if (e === null) return !1;
  let n = getAdminSteering();
  return e === "opus" ? n.opus : n.sonnet;
}

export {
  isModeDependentModelSetting,
  append1mSuffixIfMissing,
  getDefaultHaikuModel,
  getRuntimeMainLoopModel,
  isDeploymentVouchedModel,
  stepDownRestrictedFamilyAliasPick,
  planModeConstituentFamily,
  isOpusFableAdvisorSetting,
  getDefaultMainLoopModelSetting,
  resolveRuntimeMainLoopModel,
  isRecognizedOrgDefaultName,
  getResolvedOrgDefaultModel,
  resolveDefaultMainLoopModelSetting,
  getOrgLockedDefaultModel,
  getBootstrapOrgDefaultEffect,
  documentNamesCloudDefault,
  defaultModelAttributionSuffix,
  lr,
  zp,
  planModeConstituentModel,
  cloudDocumentDefaultCandidates,
};
